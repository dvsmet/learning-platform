namespace LearningPlatformAPI.DTOs
{
    public class LearningProgressDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public UserDTO? User { get; set; }
        public int LessonId { get; set; }
        public string LessonTitle { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime LastUpdated { get; set; }
    }
}