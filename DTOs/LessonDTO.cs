namespace LearningPlatformAPI.DTOs
{
    public class LessonDTO
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Content { get; set; } = null;
        public int LessonNumber { get; set; }
        public string? VideoUrl { get; set; } = null;
        public string? MaterialsNote { get; set; } = null;
    }
}
