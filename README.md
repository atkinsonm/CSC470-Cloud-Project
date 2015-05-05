# CSC470-Cloud-Project
Final Project for CSC 470 - Cloud Computing

# Current Progress
- Basic chat room implemented in server.js - this starting point will later be adapted as a question feed
- Creating new room implementation - implemented in app.js
  - Landing page (complete)
  - Generate unique room ID (complete)
  - Create bucket when given room ID (complete)
  - Adding data about created room to DynamoDB (complete)
  - Adding the uploaded file in the bucket (complete)
- Send email upon room creation to instructor-specified email list (complete)
  - Add link for email recipients to access the room (complete)
- Room UI and functionality
  - Chat room (complete)
  - View of presentation (complete)
  - Hand raising (complete)
  - Progress updates for presenter (phase 2? incomplete)
  - Advanced presentation features (i.e. pointer, etc. ) (phase 2? incomplete)
- Delete room when the instructor closes the session 
  - Delete bucket (complete)
  - Delete DB entry (complete)
  - Listen for delete-room event (incomplete)
