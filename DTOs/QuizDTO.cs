namespace LearningPlatformAPI.DTOs
{
    public class QuizDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int LessonId { get; set; }
        public int MaxScore { get; set; }
        public List<QuizQuestionDTO>? Questions { get; set; }
    }
}
