using ClosedXML.Excel;
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
    /// <summary>Порог «тест сдан»: лучший результат не ниже этого % от максимума балла (в модели теста порог не хранится).</summary>
    public const int DefaultPassingScorePercent = 60;

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

    private sealed record QuizInfo(int Id, int LessonId, string Title, int MaxScore);

    private sealed class AnalyticsScope
    {
        public bool IsAdmin { get; init; }
        public List<Course> Courses { get; init; } = [];
        public List<(int CourseId, int UserId)> EnrollmentRows { get; init; } = [];
        public Dictionary<int, HashSet<int>> EnrollmentsByCourse { get; init; } = [];
        public Dictionary<int, int> LessonToCourse { get; init; } = [];
        public Dictionary<int, List<(int UserId, int LessonId, string? Status)>> ProgressesByCourse { get; init; } = [];
        public List<QuizInfo> Quizzes { get; init; } = [];
        public Dictionary<int, QuizInfo> QuizById { get; init; } = [];
        public List<(int QuizId, int UserId, int Score, DateTime CompletionDate)> RawResults { get; init; } = [];
    }

    private async Task<(AnalyticsScope? Scope, IActionResult? Error)> TryLoadScopeForCurrentUserAsync()
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
            return (new AnalyticsScope
            {
                IsAdmin = isAdmin,
                Courses = [],
                EnrollmentRows = [],
                EnrollmentsByCourse = [],
                LessonToCourse = [],
                ProgressesByCourse = [],
                Quizzes = [],
                QuizById = [],
                RawResults = []
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

        List<(int QuizId, int UserId, int Score, DateTime CompletionDate)> rawResults;
        if (quizIds.Count == 0)
            rawResults = [];
        else
            rawResults = await _context.QuizResults.AsNoTracking()
                .Where(qr => quizIds.Contains(qr.QuizId))
                .Select(qr => new ValueTuple<int, int, int, DateTime>(qr.QuizId, qr.UserId, qr.Score, qr.CompletionDate))
                .ToListAsync();

        var rowList = enrollmentRows.Select(e => (e.CourseId, e.UserId)).ToList();

        return (new AnalyticsScope
        {
            IsAdmin = isAdmin,
            Courses = courses,
            EnrollmentRows = rowList,
            EnrollmentsByCourse = enrollmentsByCourse,
            LessonToCourse = lessonToCourse,
            ProgressesByCourse = progressesByCourse,
            Quizzes = quizzes,
            QuizById = quizById,
            RawResults = rawResults
        }, null);
    }

    private static Dictionary<int, List<(int QuizId, int UserId, int Score, int MaxScore)>> BuildResultsByCourse(
        AnalyticsScope scope)
    {
        var courseIds = scope.Courses.Select(c => c.Id).ToList();
        var resultsByCourse = courseIds.ToDictionary(id => id, _ => new List<(int QuizId, int UserId, int Score, int MaxScore)>());
        foreach (var r in scope.RawResults)
        {
            if (!scope.QuizById.TryGetValue(r.QuizId, out var qi)) continue;
            if (!scope.LessonToCourse.TryGetValue(qi.LessonId, out var cid)) continue;
            resultsByCourse[cid].Add((r.QuizId, r.UserId, r.Score, qi.MaxScore));
        }

        return resultsByCourse;
    }

    private AnalyticsDashboardDTO BuildDashboardFromScope(AnalyticsScope scope)
    {
        if (scope.Courses.Count == 0)
            return new AnalyticsDashboardDTO { Courses = [], Instructors = scope.IsAdmin ? [] : null };

        var resultsByCourse = BuildResultsByCourse(scope);
        var courseDtos = new List<CourseAnalyticsDTO>();
        foreach (var c in scope.Courses.OrderBy(x => x.Title))
        {
            var dto = BuildCourseDto(
                c,
                scope.EnrollmentsByCourse.GetValueOrDefault(c.Id) ?? [],
                scope.ProgressesByCourse[c.Id],
                resultsByCourse[c.Id],
                scope.Quizzes.Where(q => scope.LessonToCourse.GetValueOrDefault(q.LessonId) == c.Id).ToList());
            courseDtos.Add(dto);
        }

        List<InstructorAnalyticsDTO>? instructorDtos = null;
        if (scope.IsAdmin)
        {
            instructorDtos = courseDtos
                .GroupBy(x => x.InstructorId)
                .Select(g =>
                {
                    var name = g.First().InstructorName ?? "";
                    var courseList = g.ToList();
                    var studentIds = scope.EnrollmentRows
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

        return new AnalyticsDashboardDTO { Courses = courseDtos, Instructors = instructorDtos };
    }

    /// <summary>Сводка аналитики: курсы; для админа — ещё сводка по инструкторам.</summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AnalyticsDashboardDTO), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard()
    {
        var (scope, error) = await TryLoadScopeForCurrentUserAsync();
        if (error != null) return error;
        if (scope == null) return Unauthorized();
        return Ok(BuildDashboardFromScope(scope));
    }

    /// <summary>Список обучающихся с одобренной записью на курсы в зоне видимости (все курсы для админа, свои — для инструктора).</summary>
    [HttpGet("learners")]
    [ProducesResponseType(typeof(LearnerAnalyticsListDTO), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLearners()
    {
        var (scope, error) = await TryLoadScopeForCurrentUserAsync();
        if (error != null) return error;
        if (scope == null) return Unauthorized();
        var list = await BuildLearnerSummariesAsync(scope);
        return Ok(new LearnerAnalyticsListDTO
        {
            PassingScorePercent = DefaultPassingScorePercent,
            Learners = list
        });
    }

    /// <summary>Детализация по обучающемуся: прогресс и статус каждого теста.</summary>
    [HttpGet("learners/{userId:int}")]
    [ProducesResponseType(typeof(LearnerAnalyticsDetailDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLearnerDetail(int userId)
    {
        var (scope, error) = await TryLoadScopeForCurrentUserAsync();
        if (error != null) return error;
        if (scope == null) return Unauthorized();

        var allowed = scope.EnrollmentRows.Any(e => e.UserId == userId);
        if (!allowed) return NotFound();

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var detail = BuildLearnerDetail(scope, user);
        return Ok(detail);
    }

    private async Task<List<LearnerAnalyticsSummaryDTO>> BuildLearnerSummariesAsync(AnalyticsScope scope)
    {
        var userIds = scope.EnrollmentRows.Select(e => e.UserId).Distinct().ToList();
        if (userIds.Count == 0) return [];

        var users = await _context.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Name, u.Email })
            .ToListAsync();
        var byId = users.ToDictionary(u => u.Id);

        var list = new List<LearnerAnalyticsSummaryDTO>();
        foreach (var uid in userIds.OrderBy(id => byId.GetValueOrDefault(id)?.Name ?? ""))
        {
            if (!byId.TryGetValue(uid, out var u)) continue;
            var agg = AggregateLearnerQuizStats(scope, uid);
            var coursesForUser = scope.EnrollmentRows.Where(e => e.UserId == uid).Select(e => e.CourseId).Distinct().ToList();
            double avgProg = 0;
            if (coursesForUser.Count > 0)
            {
                var sum = 0.0;
                foreach (var cid in coursesForUser)
                {
                    var course = scope.Courses.FirstOrDefault(c => c.Id == cid);
                    if (course == null) continue;
                    sum += ComputeUserCourseProgressPercent(scope, uid, course);
                }

                avgProg = sum / coursesForUser.Count;
            }

            list.Add(new LearnerAnalyticsSummaryDTO
            {
                UserId = uid,
                Name = u.Name,
                Email = u.Email,
                EnrolledCoursesCount = coursesForUser.Count,
                AvgProgressPercent = Math.Round(avgProg, 1),
                QuizzesTotal = agg.TotalQuizzes,
                QuizzesAttempted = agg.Attempted,
                QuizzesPassed = agg.Passed,
                LastQuizAttemptUtc = agg.LastAttemptUtc
            });
        }

        return list;
    }

    private sealed record LearnerQuizAgg(int TotalQuizzes, int Attempted, int Passed, DateTime? LastAttemptUtc);

    private LearnerQuizAgg AggregateLearnerQuizStats(AnalyticsScope scope, int userId)
    {
        var courseIds = scope.EnrollmentRows.Where(e => e.UserId == userId).Select(e => e.CourseId).Distinct().ToHashSet();
        var quizIdsInPortfolio = new HashSet<int>();
        foreach (var cid in courseIds)
        {
            var course = scope.Courses.FirstOrDefault(c => c.Id == cid);
            if (course == null) continue;
            foreach (var lesson in course.Lessons)
            foreach (var q in scope.Quizzes.Where(x => x.LessonId == lesson.Id))
                quizIdsInPortfolio.Add(q.Id);
        }

        var total = quizIdsInPortfolio.Count;
        var attempted = 0;
        var passed = 0;
        DateTime? last = null;
        foreach (var qid in quizIdsInPortfolio)
        {
            if (!scope.QuizById.TryGetValue(qid, out var qi)) continue;
            var attempts = scope.RawResults.Where(r => r.QuizId == qid && r.UserId == userId).ToList();
            if (attempts.Count == 0) continue;
            attempted++;
            var bestPct = attempts.Max(a => qi.MaxScore > 0 ? a.Score * 100.0 / qi.MaxScore : 0);
            if (bestPct >= DefaultPassingScorePercent) passed++;
            var lastHere = attempts.Max(a => a.CompletionDate);
            if (!last.HasValue || lastHere > last) last = lastHere;
        }

        return new LearnerQuizAgg(total, attempted, passed, last);
    }

    private static double ComputeUserCourseProgressPercent(AnalyticsScope scope, int userId, Course course)
    {
        var lessonsTotal = course.Lessons.Count;
        if (lessonsTotal == 0) return 0;
        if (!scope.EnrollmentsByCourse.TryGetValue(course.Id, out var enrolled) || !enrolled.Contains(userId))
            return 0;
        var courseProgresses = scope.ProgressesByCourse.GetValueOrDefault(course.Id) ?? [];
        var doneLessons = courseProgresses
            .Where(p => p.UserId == userId && IsStatus(p.Status, "completed"))
            .Select(p => p.LessonId)
            .Distinct()
            .Count();
        return doneLessons * 100.0 / lessonsTotal;
    }

    private LearnerAnalyticsDetailDTO BuildLearnerDetail(AnalyticsScope scope, User user)
    {
        var coursesOut = new List<LearnerCourseDetailDTO>();
        foreach (var course in scope.Courses.OrderBy(c => c.Title))
        {
            if (!scope.EnrollmentsByCourse.TryGetValue(course.Id, out var enrolled) || !enrolled.Contains(user.Id))
                continue;

            var progressPct = ComputeUserCourseProgressPercent(scope, user.Id, course);
            var lessonsTotal = course.Lessons.Count;
            var courseProgresses = scope.ProgressesByCourse.GetValueOrDefault(course.Id) ?? [];
            var doneLessons = courseProgresses
                .Where(p => p.UserId == user.Id && IsStatus(p.Status, "completed"))
                .Select(p => p.LessonId)
                .Distinct()
                .Count();

            var quizRows = new List<LearnerQuizRowDTO>();
            foreach (var lesson in course.Lessons.OrderBy(l => l.LessonNumber))
            {
                foreach (var q in scope.Quizzes.Where(x => x.LessonId == lesson.Id).OrderBy(x => x.Id))
                {
                    var attempts = scope.RawResults.Where(r => r.QuizId == q.Id && r.UserId == user.Id).ToList();
                    double? bestPct = null;
                    DateTime? lastDt = null;
                    if (attempts.Count > 0)
                    {
                        bestPct = Math.Round(attempts.Max(a => q.MaxScore > 0 ? a.Score * 100.0 / q.MaxScore : 0), 1);
                        lastDt = attempts.Max(a => a.CompletionDate);
                    }

                    var passed = bestPct.HasValue && bestPct.Value >= DefaultPassingScorePercent;
                    quizRows.Add(new LearnerQuizRowDTO
                    {
                        QuizId = q.Id,
                        QuizTitle = q.Title,
                        LessonId = lesson.Id,
                        LessonNumber = lesson.LessonNumber,
                        LessonTitle = lesson.Title,
                        AttemptsCount = attempts.Count,
                        BestScorePercent = bestPct,
                        Passed = passed,
                        LastAttemptUtc = lastDt
                    });
                }
            }

            coursesOut.Add(new LearnerCourseDetailDTO
            {
                CourseId = course.Id,
                CourseTitle = course.Title,
                ProgressPercent = Math.Round(progressPct, 1),
                LessonsCompleted = doneLessons,
                LessonsTotal = lessonsTotal,
                AllLessonsCompleted = lessonsTotal > 0 && doneLessons >= lessonsTotal,
                Quizzes = quizRows
            });
        }

        return new LearnerAnalyticsDetailDTO
        {
            PassingScorePercent = DefaultPassingScorePercent,
            UserId = user.Id,
            Name = user.Name,
            Email = user.Email,
            Courses = coursesOut
        };
    }

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
    public async Task<IActionResult> ExportExcel()
    {
        var (scope, error) = await TryLoadScopeForCurrentUserAsync();
        if (error != null) return error;
        if (scope == null) return Unauthorized();

        var data = BuildDashboardFromScope(scope);

        using var workbook = new XLWorkbook();

        static void StyleHeader(IXLWorksheet ws, int lastCol)
        {
            ws.Range(1, 1, 1, lastCol).Style.Font.Bold = true;
        }

        static void FinishSheet(IXLWorksheet ws, int lastCol)
        {
            StyleHeader(ws, lastCol);
            ws.Columns(1, lastCol).AdjustToContents();
            ws.SheetView.FreezeRows(1);
        }

        {
            var ws = workbook.Worksheets.Add("Курсы");
            var headers = new[]
            {
                "ID курса", "Название курса", "Инструктор", "Число уроков", "Записалось человек",
                "Строк прогресса «начато»", "Строк прогресса «завершено»", "Средний прогресс (%)",
                "Процент завершивших все уроки", "Завершили все уроки (чел.)", "Средний балл тестов (%)", "Всего попыток тестов"
            };
            for (var c = 0; c < headers.Length; c++)
                ws.Cell(1, c + 1).Value = headers[c];
            var row = 2;
            foreach (var x in data.Courses.OrderByDescending(x => x.EnrolledCount))
            {
                ws.Cell(row, 1).Value = x.CourseId;
                ws.Cell(row, 2).Value = x.Title;
                ws.Cell(row, 3).Value = x.InstructorName ?? "";
                ws.Cell(row, 4).Value = x.LessonsTotal;
                ws.Cell(row, 5).Value = x.EnrolledCount;
                ws.Cell(row, 6).Value = x.LessonProgressStartedRows;
                ws.Cell(row, 7).Value = x.LessonProgressCompletedRows;
                ws.Cell(row, 8).Value = x.AvgProgressPercent;
                ws.Cell(row, 9).Value = x.CompletionRatePercent;
                ws.Cell(row, 10).Value = x.FullyCompletedLearnersCount;
                if (x.AvgNormalizedQuizScore.HasValue)
                    ws.Cell(row, 11).Value = x.AvgNormalizedQuizScore.Value;
                ws.Cell(row, 12).Value = x.TotalQuizAttempts;
                row++;
            }
            FinishSheet(ws, headers.Length);
        }

        if (data.Instructors is { Count: > 0 })
        {
            var ws = workbook.Worksheets.Add("Инструкторы");
            var headers = new[]
            {
                "ID инструктора", "Инструктор", "Число курсов", "Студентов (уник.)",
                "Средний прогресс по курсам (%)", "Средний балл тестов по курсам (%)"
            };
            for (var c = 0; c < headers.Length; c++)
                ws.Cell(1, c + 1).Value = headers[c];
            var row = 2;
            foreach (var i in data.Instructors.OrderByDescending(x => x.DistinctStudentsCount))
            {
                ws.Cell(row, 1).Value = i.InstructorId;
                ws.Cell(row, 2).Value = i.Name;
                ws.Cell(row, 3).Value = i.CoursesCount;
                ws.Cell(row, 4).Value = i.DistinctStudentsCount;
                ws.Cell(row, 5).Value = i.AvgProgressPercentAcrossCourses;
                if (i.AvgNormalizedQuizScoreAcrossCourses.HasValue)
                    ws.Cell(row, 6).Value = i.AvgNormalizedQuizScoreAcrossCourses.Value;
                row++;
            }
            FinishSheet(ws, headers.Length);
        }

        var learnerRows = await BuildLearnerSummariesAsync(scope);
        if (learnerRows.Count > 0)
        {
            {
                var ws = workbook.Worksheets.Add("Обучающиеся");
                var headers = new[]
                {
                    "ID пользователя", "ФИО", "Email", "Число курсов по записи", "Средний прогресс (%)",
                    "Тестов всего", "Тестов с попытками", "Тестов сдано (по порогу)", "Последняя попытка теста (UTC)"
                };
                for (var c = 0; c < headers.Length; c++)
                    ws.Cell(1, c + 1).Value = headers[c];
                var row = 2;
                foreach (var L in learnerRows.OrderByDescending(x => x.LastQuizAttemptUtc))
                {
                    ws.Cell(row, 1).Value = L.UserId;
                    ws.Cell(row, 2).Value = L.Name;
                    ws.Cell(row, 3).Value = L.Email;
                    ws.Cell(row, 4).Value = L.EnrolledCoursesCount;
                    ws.Cell(row, 5).Value = L.AvgProgressPercent;
                    ws.Cell(row, 6).Value = L.QuizzesTotal;
                    ws.Cell(row, 7).Value = L.QuizzesAttempted;
                    ws.Cell(row, 8).Value = L.QuizzesPassed;
                    if (L.LastQuizAttemptUtc.HasValue)
                        ws.Cell(row, 9).Value = L.LastQuizAttemptUtc.Value;
                    row++;
                }
                FinishSheet(ws, headers.Length);
            }

            {
                var ws = workbook.Worksheets.Add("Тесты подробно");
                var headers = new[]
                {
                    "ID пользователя", "Email", "ID курса", "Курс", "Номер урока", "Название урока", "ID теста", "Тест",
                    "Число попыток", "Лучший результат (%)", "Сдано по порогу (1 да / 0 нет)", "Последняя попытка (UTC)"
                };
                for (var c = 0; c < headers.Length; c++)
                    ws.Cell(1, c + 1).Value = headers[c];
                var row = 2;
                var learnerIds = learnerRows.Select(l => l.UserId).Distinct().ToList();
                var users = await _context.Users.AsNoTracking()
                    .Where(u => learnerIds.Contains(u.Id))
                    .ToDictionaryAsync(u => u.Id);
                foreach (var L in learnerRows.OrderBy(x => x.Name))
                {
                    if (!users.TryGetValue(L.UserId, out var u)) continue;
                    var detail = BuildLearnerDetail(scope, u);
                    foreach (var course in detail.Courses)
                    foreach (var q in course.Quizzes)
                    {
                        ws.Cell(row, 1).Value = L.UserId;
                        ws.Cell(row, 2).Value = L.Email;
                        ws.Cell(row, 3).Value = course.CourseId;
                        ws.Cell(row, 4).Value = course.CourseTitle;
                        ws.Cell(row, 5).Value = q.LessonNumber;
                        ws.Cell(row, 6).Value = q.LessonTitle;
                        ws.Cell(row, 7).Value = q.QuizId;
                        ws.Cell(row, 8).Value = q.QuizTitle;
                        ws.Cell(row, 9).Value = q.AttemptsCount;
                        if (q.BestScorePercent.HasValue)
                            ws.Cell(row, 10).Value = q.BestScorePercent.Value;
                        ws.Cell(row, 11).Value = q.Passed ? 1 : 0;
                        if (q.LastAttemptUtc.HasValue)
                            ws.Cell(row, 12).Value = q.LastAttemptUtc.Value;
                        row++;
                    }
                }
                FinishSheet(ws, headers.Length);
            }
        }

        await using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var bytes = stream.ToArray();
        var fileName = $"analytics_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}
