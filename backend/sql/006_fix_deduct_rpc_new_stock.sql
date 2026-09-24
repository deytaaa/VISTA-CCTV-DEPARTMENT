-- Fix: deduct_inventory_for_job_order returned a double-subtracted new_stock
--
-- The `deductions` array is built by a SELECT that runs AFTER the deduction
-- loop has already applied the update. It computed:
--
--     new_stock = ii.current_stock - quantity
--
-- but ii.current_stock had ALREADY been decremented by that same quantity, so
-- the reported new_stock was low by exactly `quantity`. That value feeds the
-- low-stock / out-of-stock notification logic in jobOrderController, so items
-- would be reported as out of stock while real stock remained.
--
-- The stock UPDATE itself was always correct; only the returned payload was
-- wrong. Now that new_stock simply reports the post-update value.
--
-- NOTE: this RPC is not currently on the hot path — lib/inventory.js performs
-- the deduction in JS with a compare-and-swap. Fixed here so the RPC is a
-- correct target if that is ever switched back. The other prerequisite is that
-- callers must send `inventory_item_id` on each item (they now do); the RPC
-- resolves rows by that key and silently skips items without it.

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
    where id = (item->>'inventory_item_id')::uuid
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
    where id = (item->>'inventory_item_id')::uuid
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

  /*
    Return shape:
    - shortages: array of shortage objects (existing behavior)
    - deductions: array of per-item deduction results needed for inventory notifications
  */
  return jsonb_build_object(
    'shortages', shortages,
    'deductions', (
      select coalesce(jsonb_agg(d), '[]'::jsonb)
      from (
        select
          ii.id as inventory_item_id,
          ii.item_name,
          ii.unit,
          ii.minimum_stock,
          coalesce(ii.current_stock, 0) as new_stock,
          coalesce((elem->>'quantity')::numeric, 0) as quantity_used
        from jsonb_array_elements(p_items) as elem
        join public.inventory_items ii
          on ii.id = (elem->>'inventory_item_id')::uuid
        where coalesce((elem->>'quantity')::numeric, 0) > 0
      ) d
    )
  );
end;
$$;
