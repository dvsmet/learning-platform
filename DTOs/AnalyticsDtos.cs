namespace LearningPlatformAPI.DTOs;

public class AnalyticsDashboardDTO
{
    public List<CourseAnalyticsDTO> Courses { get; set; } = [];
    /// <summary>Заполняется только для администратора.</summary>
    public List<InstructorAnalyticsDTO>? Instructors { get; set; }
}

public class CourseAnalyticsDTO
{
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int InstructorId { get; set; }
    public string? InstructorName { get; set; }
    public int LessonsTotal { get; set; }
    /// <summary>Уникальных пользователей с одобренной заявкой на курс.</summary>
    public int EnrolledCount { get; set; }
    /// <summary>Записей прогресса со статусом started (урок открыт, но не завершён по логике статуса).</summary>
    public int LessonProgressStartedRows { get; set; }
    /// <summary>Записей прогресса со статусом completed.</summary>
    public int LessonProgressCompletedRows { get; set; }
    /// <summary>Средний % завершения уроков среди записанных (0, если нет уроков).</summary>
    public double AvgProgressPercent { get; set; }
    /// <summary>Доля записанных, у кого завершены все уроки курса (0–100).</summary>
    public double CompletionRatePercent { get; set; }
    /// <summary>Число записанных, завершивших все уроки.</summary>
    public int FullyCompletedLearnersCount { get; set; }
    /// <summary>Средний нормализованный балл попыток (0–100) по всем тестам курса.</summary>
    public double? AvgNormalizedQuizScore { get; set; }
    /// <summary>Всего попыток сдачи тестов по курсу.</summary>
    public int TotalQuizAttempts { get; set; }
    /// <summary>Распределение нормализованных баллов попыток по 10 корзинам (0–9, 10–19, …, 90–100).</summary>
    public int[] ScoreDistributionBins { get; set; } = new int[10];
    public List<QuizAttemptSummaryDTO> QuizSummaries { get; set; } = [];
}

public class QuizAttemptSummaryDTO
{
    public int QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int LessonId { get; set; }
    public int AttemptsCount { get; set; }
    public double? AvgNormalizedScore { get; set; }
}

public class InstructorAnalyticsDTO
{
    public int InstructorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CoursesCount { get; set; }
    /// <summary>Уникальных студентов с одобренной заявкой хотя бы на один курс инструктора.</summary>
    public int DistinctStudentsCount { get; set; }
    public double AvgProgressPercentAcrossCourses { get; set; }
    public double? AvgNormalizedQuizScoreAcrossCourses { get; set; }
}
