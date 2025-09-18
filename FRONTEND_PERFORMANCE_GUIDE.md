# Frontend Performance Data Guide

## Overview
This guide explains how to retrieve performance data from the backend after a session is completed. The system provides multiple ways to get performance analytics, from individual session reports to comprehensive user analytics.

## Authentication Required
All performance endpoints require authentication. Include the JWT token in the Authorization header:

```javascript
const headers = {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
};
```

## Performance Data Sources

### 1. Session Performance (from conversations table)
- **Source**: `conversations` table
- **Data**: Individual question performance, confidence scores, time taken
- **Use Case**: Detailed session analysis

### 2. Performance Analytics (from performance table)
- **Source**: `performance` table
- **Data**: Aggregated metrics, trends, insights
- **Use Case**: Overall user performance tracking

### 3. Dynamic Question Reports
- **Source**: Dynamic question service
- **Data**: Adaptive learning performance, difficulty progression
- **Use Case**: Dynamic session analysis

## API Endpoints for Performance Data

### 1. Get Session Performance Summary

#### Endpoint: `GET /api/performance/summary`
**Purpose**: Get overall performance summary for the user

**Request**:
```javascript
const response = await fetch('/api/performance/summary?days=30', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Query Parameters**:
- `days` (optional): Number of days to include (default: 30)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sessions": 15,
      "total_questions": 150,
      "average_confidence_score": 0.75,
      "average_time_per_question": 45.5,
      "total_time_minutes": 682.5,
      "performance_by_category": {
        "Technical": 0.78,
        "Behavioral": 0.72,
        "System Design": 0.65
      },
      "performance_by_difficulty": {
        "easy": 0.85,
        "medium": 0.75,
        "hard": 0.65
      },
      "improvement_trend": "positive",
      "strengths": ["JavaScript", "React"],
      "weaknesses": ["System Design", "Algorithms"]
    }
  }
}
```

### 2. Get Session-Specific Performance

#### Endpoint: `GET /api/performance`
**Purpose**: Get detailed performance records for a specific session

**Request**:
```javascript
const response = await fetch('/api/performance?sessionId=session-uuid&limit=100', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Query Parameters**:
- `sessionId` (optional): Specific session ID
- `conversationId` (optional): Specific conversation ID
- `metricType` (optional): Filter by metric type
- `performanceCategory` (optional): Filter by category
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `days` (optional): Number of days to include (default: 30)

**Response**:
```json
{
  "success": true,
  "data": {
    "performances": [
      {
        "id": "perf-uuid",
        "user_id": "user-uuid",
        "session_id": "session-uuid",
        "conversation_id": "conv-uuid",
        "metric_type": "confidence_score",
        "metric_value": 0.85,
        "metric_max_value": 1.00,
        "metric_unit": "score",
        "performance_category": "technical",
        "feedback_notes": "Good understanding of closures",
        "improvement_suggestions": "Practice more examples",
        "recorded_at": "2024-01-01T10:00:00Z",
        "created_at": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 1
    }
  }
}
```

### 3. Get Performance Trends

#### Endpoint: `GET /api/performance/trends/{metricType}`
**Purpose**: Get performance trends over time for a specific metric

**Request**:
```javascript
const response = await fetch('/api/performance/trends/confidence_score?days=30', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Path Parameters**:
- `metricType`: The metric to analyze (e.g., confidence_score, overall_score, communication)

**Query Parameters**:
- `days` (optional): Number of days to include (default: 30)

**Response**:
```json
{
  "success": true,
  "data": {
    "metric_type": "confidence_score",
    "trends": [
      {
        "date": "2024-01-01",
        "value": 0.75,
        "sessions_count": 3
      },
      {
        "date": "2024-01-02",
        "value": 0.78,
        "sessions_count": 2
      }
    ]
  }
}
```

### 4. Get Performance Insights

#### Endpoint: `GET /api/performance/insights`
**Purpose**: Get AI-generated insights and recommendations

**Request**:
```javascript
const response = await fetch('/api/performance/insights?days=30', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Query Parameters**:
- `days` (optional): Number of days to include (default: 30)

**Response**:
```json
{
  "success": true,
  "data": {
    "insights": {
      "overall_assessment": "Good progress with room for improvement",
      "strengths": [
        "Strong understanding of JavaScript fundamentals",
        "Good communication skills",
        "Consistent practice habits"
      ],
      "weaknesses": [
        "System design concepts need work",
        "Algorithm problem-solving could improve",
        "Time management during interviews"
      ],
      "recommendations": [
        "Focus on system design practice",
        "Practice algorithm problems daily",
        "Work on time management techniques"
      ],
      "improvement_areas": [
        {
          "area": "System Design",
          "current_score": 0.65,
          "target_score": 0.80,
          "priority": "high"
        },
        {
          "area": "Algorithms",
          "current_score": 0.70,
          "target_score": 0.85,
          "priority": "medium"
        }
      ],
      "next_steps": [
        "Complete 5 system design practice sessions",
        "Solve 10 algorithm problems this week",
        "Practice mock interviews with time constraints"
      ]
    }
  }
}
```

### 5. Get Session Comparison

#### Endpoint: `GET /api/performance/compare-sessions`
**Purpose**: Compare performance between multiple sessions

**Request**:
```javascript
const response = await fetch('/api/performance/compare-sessions?sessionIds=session1-uuid,session2-uuid,session3-uuid', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Query Parameters**:
- `sessionIds`: Comma-separated list of session IDs

**Response**:
```json
{
  "success": true,
  "data": {
    "comparison": {
      "sessions": [
        {
          "session_id": "session1-uuid",
          "session_name": "JavaScript Practice",
          "average_confidence": 0.75,
          "total_questions": 10,
          "total_time_minutes": 45,
          "performance_by_category": {
            "Technical": 0.78,
            "Behavioral": 0.72
          }
        }
      ],
      "improvement": {
        "confidence_score": "+0.05",
        "time_efficiency": "+10%",
        "question_accuracy": "+8%"
      },
      "trends": {
        "getting_better": ["Technical", "Communication"],
        "needs_work": ["System Design", "Algorithms"]
      }
    },
    "session_ids": ["session1-uuid", "session2-uuid", "session3-uuid"]
  }
}
```

### 6. Get Performance Dashboard Data

#### Endpoint: `GET /api/performance/dashboard/analytics`
**Purpose**: Get comprehensive dashboard data for performance analytics

**Request**:
```javascript
const response = await fetch('/api/performance/dashboard/analytics?days=30', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Query Parameters**:
- `days` (optional): Number of days to include (default: 30)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_sessions": 15,
      "total_questions": 150,
      "average_confidence_score": 0.75,
      "average_time_per_question": 45.5
    },
    "insights": {
      "overall_assessment": "Good progress",
      "strengths": ["JavaScript", "React"],
      "weaknesses": ["System Design"],
      "recommendations": ["Practice system design"]
    },
    "trends": {
      "metric_type": "overall_score",
      "data": [
        {
          "date": "2024-01-01",
          "value": 0.75,
          "sessions_count": 3
        }
      ]
    },
    "period_days": 30
  }
}
```

### 7. Get Dynamic Question Performance Report

#### Endpoint: `POST /api/dynamic-questions/generate-report`
**Purpose**: Get performance report for dynamic question sessions

**Request**:
```javascript
const response = await fetch('/api/dynamic-questions/generate-report', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: 'dynamic-session-uuid'
  })
});
```

**Request Body**:
```json
{
  "sessionId": "dynamic-session-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Performance report generated successfully",
  "data": {
    "report": {
      "sessionId": "dynamic-session-uuid",
      "skillDomain": "JavaScript",
      "summary": {
        "totalQuestions": 15,
        "answeredQuestions": 12,
        "avgConfidenceScore": 0.72,
        "avgTimePerQuestion": 45.5,
        "difficultyProgression": ["medium", "hard", "medium", "hard"]
      },
      "strengths": ["Closures", "Async Programming"],
      "weaknesses": ["Prototypes", "Memory Management"],
      "insights": [
        "Strong understanding of functional programming concepts",
        "Need to focus on object-oriented programming fundamentals"
      ],
      "recommendations": [
        "Focus on improving Prototypes and Memory Management",
        "Continue building on strengths in Closures and Async Programming"
      ],
      "generatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

## Frontend Implementation Examples

### 1. React Hook for Performance Data

```javascript
import { useState, useEffect } from 'react';

const usePerformanceData = (sessionId = null, days = 30) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        
        // Fetch multiple performance endpoints in parallel
        const [summary, insights, trends] = await Promise.all([
          fetch(`/api/performance/summary?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()),
          
          fetch(`/api/performance/insights?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()),
          
          fetch(`/api/performance/trends/confidence_score?days=${days}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(res => res.json())
        ]);

        // If specific session requested, fetch session data
        let sessionData = null;
        if (sessionId) {
          const sessionResponse = await fetch(`/api/performance?sessionId=${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          sessionData = await sessionResponse.json();
        }

        setPerformanceData({
          summary: summary.data.summary,
          insights: insights.data.insights,
          trends: trends.data.trends,
          sessionData: sessionData?.data
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [sessionId, days]);

  return { performanceData, loading, error };
};

export default usePerformanceData;
```

### 2. Performance Dashboard Component

```javascript
import React from 'react';
import usePerformanceData from './usePerformanceData';

const PerformanceDashboard = ({ sessionId }) => {
  const { performanceData, loading, error } = usePerformanceData(sessionId);

  if (loading) return <div>Loading performance data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!performanceData) return <div>No performance data available</div>;

  const { summary, insights, trends } = performanceData;

  return (
    <div className="performance-dashboard">
      <h2>Performance Dashboard</h2>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <h3>Total Sessions</h3>
          <p>{summary.total_sessions}</p>
        </div>
        <div className="card">
          <h3>Average Confidence</h3>
          <p>{(summary.average_confidence_score * 100).toFixed(1)}%</p>
        </div>
        <div className="card">
          <h3>Total Questions</h3>
          <p>{summary.total_questions}</p>
        </div>
        <div className="card">
          <h3>Avg Time per Question</h3>
          <p>{summary.average_time_per_question}s</p>
        </div>
      </div>

      {/* Performance by Category */}
      <div className="performance-categories">
        <h3>Performance by Category</h3>
        {Object.entries(summary.performance_by_category).map(([category, score]) => (
          <div key={category} className="category-item">
            <span>{category}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${score * 100}%` }}
              />
            </div>
            <span>{(score * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="insights">
        <h3>AI Insights</h3>
        <div className="insight-section">
          <h4>Strengths</h4>
          <ul>
            {insights.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
        <div className="insight-section">
          <h4>Areas for Improvement</h4>
          <ul>
            {insights.weaknesses.map((weakness, index) => (
              <li key={index}>{weakness}</li>
            ))}
          </ul>
        </div>
        <div className="insight-section">
          <h4>Recommendations</h4>
          <ul>
            {insights.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="trends">
        <h3>Performance Trends</h3>
        <div className="chart">
          {trends.map((trend, index) => (
            <div key={index} className="trend-point">
              <div className="trend-value" style={{ height: `${trend.value * 100}px` }} />
              <span className="trend-date">{new Date(trend.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
```

### 3. Session Performance Component

```javascript
import React, { useState } from 'react';

const SessionPerformance = ({ sessionId }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSessionPerformance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`/api/performance?sessionId=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPerformanceData(data.data);
    } catch (error) {
      console.error('Failed to fetch session performance:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (sessionId) {
      fetchSessionPerformance();
    }
  }, [sessionId]);

  if (loading) return <div>Loading session performance...</div>;
  if (!performanceData) return <div>No session data available</div>;

  return (
    <div className="session-performance">
      <h3>Session Performance</h3>
      <div className="performance-metrics">
        {performanceData.performances.map((perf) => (
          <div key={perf.id} className="metric-item">
            <h4>{perf.metric_type}</h4>
            <p>Value: {perf.metric_value}</p>
            <p>Category: {perf.performance_category}</p>
            {perf.feedback_notes && (
              <p>Feedback: {perf.feedback_notes}</p>
            )}
            {perf.improvement_suggestions && (
              <p>Suggestions: {perf.improvement_suggestions}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionPerformance;
```

## Error Handling

### Common Error Responses

```javascript
// Handle API errors
const handleApiError = (error, response) => {
  if (response.status === 401) {
    // Unauthorized - redirect to login
    window.location.href = '/login';
  } else if (response.status === 403) {
    // Forbidden - user doesn't have access
    console.error('Access denied to performance data');
  } else if (response.status === 404) {
    // Not found - session or performance data doesn't exist
    console.error('Performance data not found');
  } else if (response.status >= 500) {
    // Server error
    console.error('Server error:', error.message);
  }
};

// Usage in fetch
const fetchPerformanceData = async () => {
  try {
    const response = await fetch('/api/performance/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    handleApiError(error, response);
    throw error;
  }
};
```

## Best Practices

### 1. Caching Performance Data
```javascript
// Cache performance data to avoid repeated API calls
const performanceCache = new Map();

const getCachedPerformanceData = async (key, fetchFunction) => {
  if (performanceCache.has(key)) {
    return performanceCache.get(key);
  }
  
  const data = await fetchFunction();
  performanceCache.set(key, data);
  return data;
};
```

### 2. Real-time Updates
```javascript
// Use WebSocket or polling for real-time performance updates
const useRealTimePerformance = (sessionId) => {
  const [performanceData, setPerformanceData] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchPerformanceData(sessionId);
      setPerformanceData(data);
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [sessionId]);
  
  return performanceData;
};
```

### 3. Progressive Loading
```javascript
// Load performance data progressively
const loadPerformanceData = async () => {
  // Load summary first (fast)
  const summary = await fetchSummary();
  setPerformanceData(prev => ({ ...prev, summary }));
  
  // Load insights (slower)
  const insights = await fetchInsights();
  setPerformanceData(prev => ({ ...prev, insights }));
  
  // Load trends (slowest)
  const trends = await fetchTrends();
  setPerformanceData(prev => ({ ...prev, trends }));
};
```

This guide provides everything you need to retrieve and display performance data in your frontend application!
