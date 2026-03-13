namespace LearningPlatformAPI.DTOs
{
    public class QuizQuestionDTO
    {
        public int Id { get; set; }
        public int QuizId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public List<QuizOptionDTO>? Options { get; set; }
    }
}
