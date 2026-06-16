namespace LearningPlatformAPI.DTOs
{
    public class CourseDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; } = null;
        public int DurationHours { get; set; }
        public int InstructorId { get; set; }
        public UserDTO? Instructor { get; set; }
        public List<int>? CategoryIds { get; set; }
    }
}