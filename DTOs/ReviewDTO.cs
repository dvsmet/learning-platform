namespace LearningPlatformAPI.DTOs
{
    public class ReviewDTO
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public UserDTO? User { get; set; }
        public int CourseId { get; set; }
        public CourseDTO? Course { get; set; }
        public string? ReviewText { get; set; }
        public int Rating { get; set; }
        public DateTime ReviewDate { get; set; }
    }
}