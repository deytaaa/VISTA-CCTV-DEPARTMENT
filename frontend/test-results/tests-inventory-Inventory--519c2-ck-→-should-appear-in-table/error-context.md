# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\inventory.spec.js >> Inventory Management >> Add a new item with name, unit, current stock, and minimum stock → should appear in table
- Location: tests\inventory.spec.js:67:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e6]:
        - img "City of Taguig logo" [ref=e8]
        - generic [ref=e9]:
          - paragraph [ref=e10]: City Government of Taguig
          - heading "CCTV Department" [level=1] [ref=e11]
      - navigation [ref=e12]:
        - paragraph [ref=e13]: Navigation
        - generic [ref=e14]:
          - link "Dashboard" [ref=e15] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e18]
            - generic [ref=e20]: Dashboard
          - link "Inventory" [ref=e21] [cursor=pointer]:
            - /url: /inventory
            - img [ref=e24]
            - generic [ref=e27]: Inventory
      - generic [ref=e28]: Government View
    - main [ref=e29]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - button "Hide sidebar" [ref=e33] [cursor=pointer]:
            - img [ref=e34]
          - generic [ref=e36]:
            - paragraph [ref=e37]: Inventory Management
            - heading "Inventory" [level=1] [ref=e38]
        - generic [ref=e39]:
          - generic [ref=e40]:
            - paragraph [ref=e41]: inventory@gmail.com
            - paragraph [ref=e42]: inventory
          - generic [ref=e43]:
            - button "Notifications 0" [ref=e46] [cursor=pointer]:
              - text: Notifications
              - generic [ref=e47]: "0"
            - button "Sign Out" [ref=e48] [cursor=pointer]
      - generic [ref=e49]:
        - generic [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e53]:
                - generic [ref=e54]: Search
                - textbox "Search item name..." [ref=e55]: Test Item 1781751244795
              - generic [ref=e56]:
                - generic [ref=e57]: Status
                - combobox [ref=e58]:
                  - option "All Statuses" [selected]
                  - option "In Stock"
                  - option "Low Stock"
                  - option "Out Of_stock"
            - generic [ref=e59]:
              - button "Clear Filters" [ref=e61] [cursor=pointer]
              - generic [ref=e62]:
                - button "Export CSV" [disabled] [ref=e63]
                - button "Add New Item" [ref=e64] [cursor=pointer]
          - table [ref=e67]:
            - rowgroup [ref=e68]:
              - row "Item Name Unit Current Stock Min Stock Status Actions" [ref=e69]:
                - columnheader "Item Name" [ref=e70]
                - columnheader "Unit" [ref=e71]
                - columnheader "Current Stock" [ref=e72]
                - columnheader "Min Stock" [ref=e73]
                - columnheader "Status" [ref=e74]
                - columnheader "Actions" [ref=e75]
            - rowgroup [ref=e76]:
              - row "No items found." [ref=e77]:
                - cell "No items found." [ref=e78]
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]:
              - heading "Add New Item" [level=3] [ref=e83]
              - paragraph [ref=e84]: Manage inventory master data.
            - button "Close" [ref=e85] [cursor=pointer]
          - generic [ref=e86]:
            - generic [ref=e87]:
              - generic [ref=e88]: Item Name
              - textbox [ref=e89]
            - generic [ref=e90]:
              - generic [ref=e91]: Description
              - textbox [ref=e92]
            - generic [ref=e93]:
              - generic [ref=e94]: Unit
              - combobox [ref=e95]:
                - option "pieces" [selected]
                - option "meters"
                - option "sets"
                - option "rolls"
                - option "boxes"
            - generic [ref=e96]:
              - generic [ref=e97]: Current Stock
              - spinbutton [ref=e98]: "0"
              - paragraph [ref=e99]: Use Add Stock to update quantity
            - generic [ref=e100]:
              - generic [ref=e101]: Minimum Stock
              - spinbutton [ref=e102]: "10"
          - generic [ref=e103]:
            - button "Cancel" [ref=e104] [cursor=pointer]
            - button "Save" [active] [ref=e105] [cursor=pointer]
  - alert [ref=e106]
```