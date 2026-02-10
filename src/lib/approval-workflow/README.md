# Photo Book Approval Workflow (PB-030)

## Overview
Client approval workflow for photographers delivering albums to clients. Enables photographers to request approval from clients, collect feedback, and track approval status.

## Features

### 1. Approval Requests
- Create approval requests for photo book projects
- Send to clients via email
- Set optional deadlines
- Track approval status (submitted, in_review, changes_requested, approved, rejected)

### 2. Feedback System
- General project feedback
- Page-specific comments with pinned positions
- Resolve/unresolve feedback items
- Track feedback count and unresolved items

### 3. Review Process
- Clients can approve, request changes, or reject
- Add reviewer notes
- Automatic status tracking
- Audit trail of all changes

### 4. Integration
- Automatically adds reviewer as 'viewer' collaborator
- Logs activities to project activity feed
- Real-time updates via Supabase subscriptions

## Database Schema

### Tables
1. **photo_book_approval_requests**: Main approval request table
2. **photo_book_approval_feedback**: Page-specific feedback and comments
3. **photo_book_approval_history**: Audit trail of status changes

### Status Flow
```
draft → submitted → in_review → [approved | changes_requested | rejected]
```

## API Endpoints

### Approval Requests
- `POST /api/photo-book/projects/[projectId]/approval` - Create request
- `GET /api/photo-book/projects/[projectId]/approval` - Get active request
- `GET /api/photo-book/projects/[projectId]/approval/all` - Get all requests
- `PUT /api/photo-book/approval/[id]` - Update status
- `POST /api/photo-book/approval/[id]/review` - Submit review
- `DELETE /api/photo-book/approval/[id]` - Cancel request

### Feedback
- `POST /api/photo-book/approval/[id]/feedback` - Add feedback
- `GET /api/photo-book/approval/[id]/feedback` - Get all feedback
- `GET /api/photo-book/approval/[id]/feedback/page/[pageId]` - Get page feedback
- `PUT /api/photo-book/approval/feedback/[feedbackId]` - Update feedback
- `DELETE /api/photo-book/approval/feedback/[feedbackId]` - Delete feedback

### History
- `GET /api/photo-book/approval/[id]/history` - Get approval history

## Components

### UI Components
- `ApprovalRequestPanel`: Main panel for creating and managing approval requests
- `ApprovalStatusBadge`: Visual status indicator
- `ApprovalFeedbackList`: List of feedback items
- `FeedbackCommentForm`: Form to add new feedback
- `ApprovalReviewForm`: Form for reviewers to submit decisions

## Usage Example

```typescript
import { createApprovalWorkflowService } from '@/lib/approval-workflow';

// Create approval request
const service = createApprovalWorkflowService();
const request = await service.createApprovalRequest({
  projectId: 'project-id',
  reviewerEmail: 'client@example.com',
  title: 'Wedding Album - Final Review',
  message: 'Please review the album and let me know if any changes are needed.',
  deadline: new Date('2026-03-01'),
});

// Add feedback
await service.addFeedback(
  request.id,
  'Love this page! Can we adjust the brightness?',
  'page-id',
  { x: 0.5, y: 0.3, pageNumber: 5 }
);

// Submit review
await service.submitReview(request.id, {
  decision: 'request_changes',
  reviewerNotes: 'Overall looks great, just a few minor tweaks needed.',
});
```

## Permissions

- **Project Owner/Editor**: Can create approval requests, view feedback, cancel requests
- **Reviewer**: Can view project (as viewer collaborator), add feedback, submit review
- **Project Collaborators**: Can view approval requests and feedback, respond to feedback

## Email Notifications (Future Enhancement)

When implemented, the system should send emails for:
- Approval request created → Reviewer
- Feedback added → Project owner
- Review submitted → Project owner
- Changes requested → Project owner
- Approval/rejection → Project owner

## Testing

See `e2e/photo-book-approval.spec.ts` for comprehensive E2E tests covering:
- Creating approval requests
- Adding feedback
- Submitting reviews
- Permission checks
- Status transitions
