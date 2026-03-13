using Microsoft.EntityFrameworkCore;
using LearningPlatformAPI.Data;
using LearningPlatformAPI.Services;
using System.Text.Json;
using System.Text.Json.Serialization;
var builder = WebApplication.CreateBuilder(args);

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

builder.Services.AddDbContext<LearningPlatformContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        opts.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.WriteIndented = true;
    });

builder.Services.AddLogging();

builder.Services.AddScoped<CourseAccessService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        var origins = new[] {
            "http://localhost:5233", "https://localhost:5233",
            "http://localhost:5173", "http://127.0.0.1:5233",
        };
        var prodOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>();
        policy.WithOrigins(prodOrigins?.Length > 0 ? origins.Concat(prodOrigins).ToArray() : origins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LearningPlatformContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();

app.MapFallbackToFile("index.html");

if (!app.Urls.Any())
{
    app.Urls.Add("http://localhost:5233");
}

app.Run();