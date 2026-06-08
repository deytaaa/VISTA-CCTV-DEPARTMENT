AUTH
 Login as admin → should reach Admin Console                                        ✅
 Login as technician → should reach Technician Console                              ✅
 Login as inventory → should reach Inventory Dashboard                              ✅
 Login with wrong password → should show error message                              ✅
 Access dashboard without logging in → should redirect to login page                ✅
 Each role should only see their own sidebar navigation items                       ✅

ADMIN — USER MANAGEMENT
 View all users in the user management page                                         ✅
 Create a new technician user → should appear in the list                           ✅
 Create a new inventory user → should appear in the list                            ✅
 Edit a user's name and role → changes should save                                  ✅
 Reset a user's password → should update successfully                               ✅
 Delete a user with confirmation → should be removed from list                      ✅
 Cannot delete own admin account → should show error                                ✅

ADMIN — JOB ORDERS
 Create a new JO with location, date, inventory items, and assigned technician      ✅
 JO number should auto-generate                                                     ✅
 Inventory stock should auto-deduct when JO is created                              ✅
 Insufficient stock warning should appear if quantity exceeds available stock       ✅
 View the created JO in Job Orders list                                             ✅
 Check that the new JO appears in the technician's dashboard                        ✅

ADMIN — APPROVAL
 Go to Approval Queue → JO should appear after technician submits                   ✅         
 Click View Proof → should show the correct uploaded image                          ✅
 Approve the JO → status should change to Approved                                  ✅
 Reject the JO with a reason → status should change to Rejected                     ✅
 Approved JOs should appear in Archive                                              ✅

ADMIN — ACTIVITY LOGS
 All status changes should appear with correct timestamps                           ✅
 Creating a JO should log an entry                                                  ✅
 Approving and rejecting should log entries                                         ✅

TECHNICIAN — JOB ORDERS
 Find assigned JO in My Job Orders page                                             ✅
 Mark as Processing → status should update                                          ✅
 Upload a proof image and add completion remarks                                    ✅
 Save Proof → should save without error                                             ✅
 Submit for Approval → status should change to For Approval                         ✅
 Approved JOs should appear in the dedicated Approved sidebar page                  ✅
 Approved status should not appear in the Job Orders status filter dropdown         ✅

TECHNICIAN — REJECTED JO
 Find the Rejected JO                                                               ✅
 Re-upload Proof button should show, checkmark should not show yet                  ✅
 Upload a different proof image                                                     ✅
 After upload checkmark should appear and Re-upload button should disappear         ✅
 Submit for Approval again → status should change to For Approval                   ✅
 Admin should see the NEW image not the old one                                     ✅

TECHNICIAN — MOBILE
 Job Orders table fits on mobile without horizontal scrolling
 Three dot menu appears on mobile with correct actions per status
 Approved page loads correctly on mobile

INVENTORY — ACCESS CONTROL
 Inventory role can only see Dashboard and Inventory in sidebar                     ✅
 Cannot access Job Orders page → should show access denied                          ✅
 Cannot access Approval Queue → should show access denied                           ✅

INVENTORY — ITEM MANAGEMENT
 Add a new item with name, unit, current stock, and minimum stock                   ✅
 Edit an item → only name, description, unit, minimum stock are editable            ✅
 Current stock field is readonly in edit modal                                      ✅
 Delete an item with confirmation                                                   ✅
 Search and filter by status work correctly                                         ✅

INVENTORY — STOCK MANAGEMENT        
 Add Stock → current stock should increase                                          ✅
 Stock In transaction appears in View History                                       ✅
 Item below minimum stock shows Low Stock badge                                     ✅
 Item at zero stock shows Out of Stock badge                                        ✅
 Low stock banner appears on inventory dashboard                                    ✅             
 Inventory page updates in real-time without manual refresh 

INVENTORY — NOTIFICATIONS
 Low stock notification appears in dropdown after JO deduction                      ✅
 Notification shows correct remaining stock amount                                  ✅
 Mark notification as read → unread count should decrease                           ✅
 Mark All as Read → all notifications marked and count goes to 0                    ✅
 Delete a notification → should be removed from dropdown                            ✅

INVENTORY — EXPORT
 Export inventory list to CSV → file downloads with correct columns                 ✅
 Filter by Low Stock then export → only filtered items in CSV                       ✅
 Export item transaction history → file downloads with correct columns              ✅

PDF
 Download PDF of a completed JO → should open with all details filled in            ✅
 PDF should show correct technician name, location, items, and date                 ✅