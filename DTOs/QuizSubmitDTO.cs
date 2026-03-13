namespace LearningPlatformAPI.DTOs
{
    public class QuizSubmitDTO
    {
        public int QuizId { get; set; }
        public List<QuizAnswerDTO> Answers { get; set; } = new();
    }

    public class QuizAnswerDTO
    {
        public int QuestionId { get; set; }
        public int SelectedOptionId { get; set; }
    }
}
