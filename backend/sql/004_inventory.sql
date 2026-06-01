-- Inventory tables and enum update
-- Add 'inventory' role to user_role enum for access control
DO $$
BEGIN
  -- Add new enum value if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'inventory') THEN
    ALTER TYPE public.user_role ADD VALUE 'inventory';
  END IF;
END$$;

-- Inventory items
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  description text,
  unit text not null,
  current_stock numeric(12,2) not null default 0,
  minimum_stock numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_item_name on public.inventory_items(item_name);

-- Inventory transactions
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  transaction_type text not null,
  quantity numeric(12,2) not null,
  job_order_id uuid references public.job_orders(id) on delete set null,
  remarks text,
  performed_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_transactions_item_id on public.inventory_transactions(inventory_item_id);

create or replace function public.inventory_stock_in(
  p_inventory_item_id uuid,
  p_quantity numeric,
  p_remarks text,
  p_performed_by uuid
)
returns void
language plpgsql
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  update public.inventory_items
  set current_stock = current_stock + p_quantity,
      updated_at = now()
  where id = p_inventory_item_id;

  if not found then
    raise exception 'Inventory item not found';
  end if;

  insert into public.inventory_transactions (
    inventory_item_id,
    transaction_type,
    quantity,
    job_order_id,
    remarks,
    performed_by,
    created_at
  ) values (
    p_inventory_item_id,
    'stock_in',
    p_quantity,
    null,
    p_remarks,
    p_performed_by,
    now()
  );
end;
$$;

create or replace function public.deduct_inventory_for_job_order(
  p_items jsonb,
  p_job_order_id uuid,
  p_jo_number text,
  p_performed_by uuid,
  p_allow_insufficient_stock boolean default false
)
returns jsonb
language plpgsql
as $$
declare
  item jsonb;
  inventory_item public.inventory_items%rowtype;
  required numeric;
  available numeric;
  shortages jsonb := '[]'::jsonb;
  shortage_message text := '';
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('shortages', shortages);
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into inventory_item
    from public.inventory_items
    where lower(trim(item_name)) = lower(trim(coalesce(item->>'item_name', '')))
    limit 1;

    required := coalesce((item->>'quantity')::numeric, 0);
    if inventory_item.id is null or required <= 0 then
      continue;
    end if;

    available := coalesce(inventory_item.current_stock, 0);
    if available < required and not p_allow_insufficient_stock then
      shortages := shortages || jsonb_build_array(
        jsonb_build_object(
          'item_name', inventory_item.item_name,
          'unit', inventory_item.unit,
          'available', available,
          'required', required
        )
      );
    end if;
  end loop;

  if jsonb_array_length(shortages) > 0 and not p_allow_insufficient_stock then
    for item in select * from jsonb_array_elements(shortages)
    loop
      shortage_message := shortage_message || case when shortage_message = '' then '' else ' ' end ||
        (item->>'item_name') || ' only has ' || (item->>'available') || ' ' || (item->>'unit') || ' in stock but JO requires ' || (item->>'required') || '.';
    end loop;

    raise exception '%', shortage_message using errcode = 'P0001';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into inventory_item
    from public.inventory_items
    where lower(trim(item_name)) = lower(trim(coalesce(item->>'item_name', '')))
    limit 1;

    required := coalesce((item->>'quantity')::numeric, 0);
    if inventory_item.id is null or required <= 0 then
      continue;
    end if;

    update public.inventory_items
    set current_stock = coalesce(current_stock, 0) - required,
        updated_at = now()
    where id = inventory_item.id;

    insert into public.inventory_transactions (
      inventory_item_id,
      transaction_type,
      quantity,
      job_order_id,
      remarks,
      performed_by,
      created_at
    ) values (
      inventory_item.id,
      'stock_out',
      required,
      p_job_order_id,
      'Used in ' || coalesce(p_jo_number, p_job_order_id::text),
      p_performed_by,
      now()
    );
  end loop;

  return jsonb_build_object('shortages', shortages);
end;
$$;
