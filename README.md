# CSC470-Cloud-Project
Final Project for CSC 470 - Cloud Computing

# Current Progress
- Basic chat room implemented in server.js - this starting point will later be adapted as a question feed
- Creating new room implementation - implemented in app.js
  - Landing page (complete)
  - Generate unique room ID (complete)
  - Create bucket when given room ID (complete)
  - Adding data about created room to DynamoDB (complete)
- Send email upon room creation to instructor-specified email list (complete)
  - Add link for email recipients to access the room (incomplete)
- Delete room when the instructor closes the session 
  - Delete bucket (complete)
  - Delete DB entry (complete)
  - Listen for delete-room event (incomplete)
