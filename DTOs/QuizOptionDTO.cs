namespace LearningPlatformAPI.DTOs
{
    public class QuizOptionDTO
    {
        public int Id { get; set; }
        public int QuestionId { get; set; }
        public string OptionText { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }
}
