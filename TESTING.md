Test the entire VISTA CCTV system end-to-end using these scenarios:

Auth

 Login as admin with correct credentials → should reach Admin Console               ✅
 Login as technician with correct credentials → should reach Technician Console     ✅
 Login with wrong password → should show error message                              ✅
 Access dashboard without logging in → should redirect to login page                ✅

Admin — Job Orders

 Create a new JO with location, date, supplies, and assigned technician → JO number should auto-generate                                                                      ✅
 View the created JO in Job Orders list                                             ✅
 Check that the new JO appears in the technician's dashboard                        ✅

Technician — Processing

 Log in as technician and find the assigned JO                                      ✅
 Mark it as Processing → status should update                                       ✅
 Upload a proof image and add completion remarks                                    ✅
 Click Save Proof → should save without error                                       ✅
 Click Submit for Approval → status should change to For Approval                   ✅

Admin — Approval

 Go to Approval Queue → JO should appear                                            ✅
 Click View Proof → should show the correct uploaded image                          ✅
 Approve the JO → status should change to Approved                                  ✅
 Repeat but this time Reject with a reason → status should change to Rejected       ✅

Technician — Re-upload after Rejection

 Find the Rejected JO                                                               ✅
 Upload a different proof image                                                     ✅
 Save and resubmit for approval                                                     ✅
 Log in as admin and confirm the NEW image is showing, not the old one              ✅

Archive & Logs

 Check that approved JOs appear in Archive                                          ✅
 Check Activity Logs shows all status changes with correct timestamps               ✅

PDF
 Download PDF of a completed JO → should open correctly with all details filled in  ✅

Report any step that fails, shows the wrong data, or throws an error.

