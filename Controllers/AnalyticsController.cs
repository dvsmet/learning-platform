using System.Text;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.DTOs;
using LearningPlatformAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LearningPlatformAPI.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AnalyticsController : ControllerBase
{
    private const string Approved = "approved";
    private readonly LearningPlatformContext _context;

    public AnalyticsController(LearningPlatformContext context) => _context = context;

    private async Task<(int? uid, bool isAdmin, bool isInstructor)?> GetCurrentUserAsync()
    {
        if (!Request.Headers.TryGetValue("X-User-Id", out var vals) ||
            !int.TryParse(vals.FirstOrDefault(), out var uid))
            return null;
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == uid);
        if (user == null) return null;
        return (uid, user.IsAdmin, user.IsInstructor);
    }

    /// <summary>Сводка аналитики: курсы; для админа — ещё сводка по инструкторам.</summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AnalyticsDashboardDTO), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard()
    {
        var (data, error) = await BuildDashboardAsync();
        if (error != null) return error;
        return Ok(data);
    }

    private async Task<(AnalyticsDashboardDTO? Data, IActionResult? Error)> BuildDashboardAsync()
    {
        var me = await GetCurrentUserAsync();
        if (me == null) return (null, Unauthorized());
        var (uid, isAdmin, isInstructor) = me.Value;
        if (!isAdmin && !isInstructor) return (null, Forbid());

        IQueryable<Course> courseQuery = _context.Courses
            .AsNoTracking()
            .Include(c => c.Instructor)
            .Include(c => c.Lessons);
        if (isInstructor && !isAdmin)
            courseQuery = courseQuery.Where(c => c.InstructorId == uid);

        var courses = await courseQuery.ToListAsync();
        var courseIds = courses.Select(c => c.Id).ToList();
        if (courseIds.Count == 0)
        {
            return (new AnalyticsDashboardDTO
            {
                Courses = [],
                Instructors = isAdmin ? [] : null
            }, null);
        }

        var lessonToCourse = courses
            .SelectMany(c => c.Lessons.Select(l => (LessonId: l.Id, CourseId: c.Id)))
            .ToDictionary(x => x.LessonId, x => x.CourseId);

        var lessonIds = lessonToCourse.Keys.ToList();

        var enrollmentRows = await _context.OrderItems.AsNoTracking()
            .Where(oi => courseIds.Contains(oi.CourseId) && oi.Order.Status == Approved)
            .Select(oi => new { oi.CourseId, UserId = oi.Order.UserId })
            .ToListAsync();

        var enrollmentsByCourse = enrollmentRows
            .GroupBy(x => x.CourseId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.UserId).Distinct().ToHashSet());

        List<(int UserId, int LessonId, string? Status)> progresses;
        if (lessonIds.Count == 0)
            progresses = [];
        else
            progresses = await _context.LearningProgresses.AsNoTracking()
                .Where(lp => lessonIds.Contains(lp.LessonId))
                .Select(lp => new ValueTuple<int, int, string?>(lp.UserId, lp.LessonId, lp.Status))
                .ToListAsync();

        var progressesByCourse = courseIds.ToDictionary(id => id, _ => new List<(int UserId, int LessonId, string? Status)>());
        foreach (var p in progresses)
        {
            if (!lessonToCourse.TryGetValue(p.LessonId, out var cid)) continue;
            progressesByCourse[cid].Add(p);
        }

        var quizzes = await _context.Quizzes.AsNoTracking()
            .Where(q => lessonIds.Contains(q.LessonId))
            .Select(q => new QuizInfo(q.Id, q.LessonId, q.Title, q.MaxScore))
            .ToListAsync();

        var quizIds = quizzes.Select(q => q.Id).ToList();
        var quizById = quizzes.ToDictionary(q => q.Id);

        List<(int QuizId, int UserId, int Score)> results;
        if (quizIds.Count == 0)
            results = [];
        else
            results = await _context.QuizResults.AsNoTracking()
                .Where(qr => quizIds.Contains(qr.QuizId))
                .Select(qr => new ValueTuple<int, int, int>(qr.QuizId, qr.UserId, qr.Score))
                .ToListAsync();

        var resultsByCourse = courseIds.ToDictionary(id => id, _ => new List<(int QuizId, int UserId, int Score, int MaxScore)>());
        foreach (var r in results)
        {
            if (!quizById.TryGetValue(r.QuizId, out var qi)) continue;
            if (!lessonToCourse.TryGetValue(qi.LessonId, out var cid)) continue;
            resultsByCourse[cid].Add((r.QuizId, r.UserId, r.Score, qi.MaxScore));
        }

        var courseDtos = new List<CourseAnalyticsDTO>();
        foreach (var c in courses.OrderBy(x => x.Title))
        {
            var dto = BuildCourseDto(
                c,
                enrollmentsByCourse.GetValueOrDefault(c.Id) ?? [],
                progressesByCourse[c.Id],
                resultsByCourse[c.Id],
                quizzes.Where(q => lessonToCourse.GetValueOrDefault(q.LessonId) == c.Id).ToList());
            courseDtos.Add(dto);
        }

        List<InstructorAnalyticsDTO>? instructorDtos = null;
        if (isAdmin)
        {
            instructorDtos = courseDtos
                .GroupBy(x => x.InstructorId)
                .Select(g =>
                {
                    var name = g.First().InstructorName ?? "";
                    var courseList = g.ToList();
                    var studentIds = enrollmentRows
                        .Where(e => courseList.Any(cc => cc.CourseId == e.CourseId))
                        .Select(e => e.UserId)
                        .Distinct()
                        .ToList();
                    var avgProg = courseList.Count > 0 ? courseList.Average(x => x.AvgProgressPercent) : 0;
                    var scores = courseList.Where(x => x.AvgNormalizedQuizScore.HasValue)
                        .Select(x => x.AvgNormalizedQuizScore!.Value)
                        .ToList();
                    double? avgQuiz = scores.Count > 0 ? scores.Average() : null;
                    return new InstructorAnalyticsDTO
                    {
                        InstructorId = g.Key,
                        Name = name,
                        CoursesCount = courseList.Count,
                        DistinctStudentsCount = studentIds.Count,
                        AvgProgressPercentAcrossCourses = Math.Round(avgProg, 1),
                        AvgNormalizedQuizScoreAcrossCourses = avgQuiz.HasValue ? Math.Round(avgQuiz.Value, 1) : null
                    };
                })
                .OrderByDescending(x => x.DistinctStudentsCount)
                .ToList();
        }

        return (new AnalyticsDashboardDTO { Courses = courseDtos, Instructors = instructorDtos }, null);
    }

    private sealed record QuizInfo(int Id, int LessonId, string Title, int MaxScore);

    private static CourseAnalyticsDTO BuildCourseDto(
        Course c,
        HashSet<int> enrolled,
        List<(int UserId, int LessonId, string? Status)> courseProgresses,
        List<(int QuizId, int UserId, int Score, int MaxScore)> courseResults,
        List<QuizInfo> courseQuizzes)
    {
        var lessonsTotal = c.Lessons.Count;
        var enrolledCount = enrolled.Count;

        var startedRows = courseProgresses.Count(p => IsStatus(p.Status, "started"));
        var completedRows = courseProgresses.Count(p => IsStatus(p.Status, "completed"));

        double avgProgress = 0;
        var fullyDone = 0;
        if (lessonsTotal > 0 && enrolledCount > 0)
        {
            foreach (var userId in enrolled)
            {
                var doneLessons = courseProgresses
                    .Where(p => p.UserId == userId && IsStatus(p.Status, "completed"))
                    .Select(p => p.LessonId)
                    .Distinct()
                    .Count();
                avgProgress += doneLessons * 100.0 / lessonsTotal;
                if (doneLessons >= lessonsTotal) fullyDone++;
            }

            avgProgress /= enrolledCount;
        }

        var completionRate = enrolledCount > 0 ? fullyDone * 100.0 / enrolledCount : 0;

        double? avgNorm = null;
        var bins = new int[10];
        var quizSummaries = new List<QuizAttemptSummaryDTO>();
        var totalAttempts = courseResults.Count;

        if (courseResults.Count > 0)
        {
            var norms = new List<double>();
            foreach (var r in courseResults)
            {
                var norm = r.MaxScore > 0 ? r.Score * 100.0 / r.MaxScore : 0;
                norms.Add(norm);
                var b = (int)Math.Clamp(Math.Floor(norm / 10.0), 0, 9);
                bins[b]++;
            }

            avgNorm = norms.Average();
        }

        quizSummaries = courseQuizzes.Select(q =>
        {
            var attempts = courseResults.Where(x => x.QuizId == q.Id).ToList();
            if (attempts.Count == 0)
                return new QuizAttemptSummaryDTO
                {
                    QuizId = q.Id,
                    QuizTitle = q.Title,
                    LessonId = q.LessonId,
                    AttemptsCount = 0,
                    AvgNormalizedScore = null
                };
            var aNorm = attempts.Select(a => a.MaxScore > 0 ? a.Score * 100.0 / a.MaxScore : 0).Average();
            return new QuizAttemptSummaryDTO
            {
                QuizId = q.Id,
                QuizTitle = q.Title,
                LessonId = q.LessonId,
                AttemptsCount = attempts.Count,
                AvgNormalizedScore = Math.Round(aNorm, 1)
            };
        }).OrderBy(q => q.LessonId).ThenBy(q => q.QuizId).ToList();

        return new CourseAnalyticsDTO
        {
            CourseId = c.Id,
            Title = c.Title,
            InstructorId = c.InstructorId,
            InstructorName = c.Instructor?.Name,
            LessonsTotal = lessonsTotal,
            EnrolledCount = enrolledCount,
            LessonProgressStartedRows = startedRows,
            LessonProgressCompletedRows = completedRows,
            AvgProgressPercent = Math.Round(avgProgress, 1),
            CompletionRatePercent = Math.Round(completionRate, 1),
            FullyCompletedLearnersCount = fullyDone,
            AvgNormalizedQuizScore = avgNorm.HasValue ? Math.Round(avgNorm.Value, 1) : null,
            TotalQuizAttempts = totalAttempts,
            ScoreDistributionBins = bins,
            QuizSummaries = quizSummaries
        };
    }

    private static bool IsStatus(string? status, string target) =>
        string.Equals(status?.Trim(), target, StringComparison.OrdinalIgnoreCase);

    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv()
    {
        var (data, error) = await BuildDashboardAsync();
        if (error != null) return error;
        if (data == null) return Unauthorized();

        var sb = new StringBuilder();
        sb.Append('\uFEFF');
        sb.AppendLine(
            "course_id;title;instructor;lessons_total;enrolled;progress_started_rows;progress_completed_rows;avg_progress_pct;completion_rate_pct;fully_completed_learners;avg_quiz_score_pct;total_quiz_attempts");

        foreach (var row in data.Courses.OrderByDescending(x => x.EnrolledCount))
        {
            sb.AppendLine(string.Join(';', new[]
            {
                row.CourseId.ToString(),
                CsvEscape(row.Title),
                CsvEscape(row.InstructorName ?? ""),
                row.LessonsTotal.ToString(),
                row.EnrolledCount.ToString(),
                row.LessonProgressStartedRows.ToString(),
                row.LessonProgressCompletedRows.ToString(),
                row.AvgProgressPercent.ToString("F1", System.Globalization.CultureInfo.InvariantCulture),
                row.CompletionRatePercent.ToString("F1", System.Globalization.CultureInfo.InvariantCulture),
                row.FullyCompletedLearnersCount.ToString(),
                row.AvgNormalizedQuizScore?.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) ?? "",
                row.TotalQuizAttempts.ToString()
            }));
        }

        if (data.Instructors is { Count: > 0 })
        {
            sb.AppendLine();
            sb.AppendLine("instructor_id;instructor_name;courses_count;distinct_students;avg_progress_across_courses;avg_quiz_across_courses");
            foreach (var i in data.Instructors.OrderByDescending(x => x.DistinctStudentsCount))
            {
                sb.AppendLine(string.Join(';', new[]
                {
                    i.InstructorId.ToString(),
                    CsvEscape(i.Name),
                    i.CoursesCount.ToString(),
                    i.DistinctStudentsCount.ToString(),
                    i.AvgProgressPercentAcrossCourses.ToString("F1", System.Globalization.CultureInfo.InvariantCulture),
                    i.AvgNormalizedQuizScoreAcrossCourses?.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) ?? ""
                }));
            }
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"analytics_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private static string CsvEscape(string s)
    {
        if (string.IsNullOrEmpty(s)) return "\"\"";
        var needs = s.Contains(';') || s.Contains('"') || s.Contains('\n') || s.Contains('\r');
        var t = s.Replace("\"", "\"\"");
        return needs ? $"\"{t}\"" : t;
    }
}
