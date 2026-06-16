namespace LearningPlatformAPI.DTOs;

/// <summary>Список обучающихся для вкладки аналитики.</summary>
public class LearnerAnalyticsListDTO
{
    /// <summary>Порог в процентах от max балла теста: лучшая попытка ≥ этого значения считается «сдано».</summary>
    public int PassingScorePercent { get; set; }
    public List<LearnerAnalyticsSummaryDTO> Learners { get; set; } = [];
}

public class LearnerAnalyticsSummaryDTO
{
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int EnrolledCoursesCount { get; set; }
    public double AvgProgressPercent { get; set; }
    public int QuizzesTotal { get; set; }
    public int QuizzesAttempted { get; set; }
    public int QuizzesPassed { get; set; }
    public DateTime? LastQuizAttemptUtc { get; set; }
}

public class LearnerAnalyticsDetailDTO
{
    public int PassingScorePercent { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<LearnerCourseDetailDTO> Courses { get; set; } = [];
}

public class LearnerCourseDetailDTO
{
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = string.Empty;
    public double ProgressPercent { get; set; }
    public int LessonsCompleted { get; set; }
    public int LessonsTotal { get; set; }
    public bool AllLessonsCompleted { get; set; }
    public List<LearnerQuizRowDTO> Quizzes { get; set; } = [];
}

public class LearnerQuizRowDTO
{
    public int QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public int LessonId { get; set; }
    public int LessonNumber { get; set; }
    public string LessonTitle { get; set; } = string.Empty;
    public int AttemptsCount { get; set; }
    public double? BestScorePercent { get; set; }
    public bool Passed { get; set; }
    public DateTime? LastAttemptUtc { get; set; }
}

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

/// <summary>Сводка по записям на курсы: не приступили / сдали по порогу / не сдали или в процессе.</summary>
public class SuccessDistributionDTO
{
    /// <summary>Порог сдачи теста, % от max балла.</summary>
    public int PassingScorePercent { get; set; }
    /// <summary>Число записей в выборке (пользователь–курс).</summary>
    public int TotalEnrollments { get; set; }
    public int NotStartedCount { get; set; }
    public int PassedCount { get; set; }
    public int FailedOrInProgressCount { get; set; }
    /// <summary>Человекочитаемое описание периода.</summary>
    public string PeriodDescription { get; set; } = string.Empty;
}
