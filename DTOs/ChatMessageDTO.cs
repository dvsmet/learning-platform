namespace LearningPlatformAPI.DTOs
{
    public class ChatMessageDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int CourseId { get; set; }
        public int SenderId { get; set; }
        public string Text { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public string? SenderName { get; set; }
        public bool IsFromMe { get; set; }
    }

    public class ChatThreadDTO
    {
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public int CourseId { get; set; }
        public string? CourseTitle { get; set; }
        public int InstructorId { get; set; }
        public string? InstructorName { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public string? LastMessagePreview { get; set; }
        public bool HasUnread { get; set; }
    }
}
