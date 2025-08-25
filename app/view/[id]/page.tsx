"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, Edit, Clock, Activity } from "lucide-react"
import Link from "next/link"
import {
  getWorkout,
  flattenWorkout,
  calculateTotalTime,
  calculateFinalIntensity,
  getWarmupCooldownIntensity,
  getIntensityLabel,
  type WorkoutPlan,
  type ExerciseType,
} from "@/lib/timer-storage"

const exerciseTypeLabels: Record<ExerciseType, string> = {
  running: "달리기",
  walking: "걷기",
  rest: "휴식",
}

const exerciseTypeColors: Record<ExerciseType, string> = {
  running: "bg-pink-100 text-pink-800 border-pink-200",
  walking: "bg-green-100 text-green-800 border-green-200",
  rest: "bg-yellow-100 text-yellow-800 border-yellow-200",
}

const exerciseTypeChartColors: Record<ExerciseType, string> = {
  running: "bg-pink-400",
  walking: "bg-green-300",
  rest: "bg-yellow-200",
}

const warmupCooldownColor = "bg-sky-300"
const warmupCooldownBoxColor = "bg-sky-100 text-sky-800 border-sky-200"

export default function ViewTimerPage({ params }: { params: { id: string } }) {
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadWorkout = () => {
      const loadedWorkout = getWorkout(params.id)
      setWorkout(loadedWorkout)
      setIsLoading(false)
    }

    loadWorkout()
  }, [params.id])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}초`
    if (secs === 0) return `${mins}분`
    return `${mins}분 ${secs}초`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">타이머를 찾을 수 없습니다</h1>
          <p className="text-sm text-muted-foreground">요청하신 타이머가 존재하지 않거나 삭제되었습니다.</p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  const flattenedWorkout = flattenWorkout(workout.items)
  const totalWorkoutTime = flattenedWorkout.reduce((sum, item) => sum + item.duration, 0)
  const totalTime = calculateTotalTime(workout)

  // Create timeline data including warmup and cooldown
  const timelineData: ((typeof flattenedWorkout)[0] & {
    startTime: number
    endTime: number
    name?: string
    isWarmupCooldown?: boolean
    finalIntensity: number
  })[] = []
  let currentTime = 0

  // Add warmup
  if (workout.warmupTime > 0) {
    timelineData.push({
      id: "warmup",
      type: "walking",
      intensity: "low",
      duration: workout.warmupTime,
      startTime: currentTime,
      endTime: currentTime + workout.warmupTime,
      name: "웜업",
      isWarmupCooldown: true,
      finalIntensity: getWarmupCooldownIntensity(),
    })
    currentTime += workout.warmupTime
  }

  // Add main workout
  flattenedWorkout.forEach((item, index) => {
    const finalIntensity = calculateFinalIntensity(item.type, item.intensity || "medium")
    timelineData.push({
      ...item,
      startTime: currentTime,
      endTime: currentTime + item.duration,
      finalIntensity,
    })
    currentTime += item.duration
  })

  // Add cooldown
  if (workout.cooldownTime > 0) {
    timelineData.push({
      id: "cooldown",
      type: "walking",
      intensity: "low",
      duration: workout.cooldownTime,
      startTime: currentTime,
      endTime: currentTime + workout.cooldownTime,
      name: "쿨다운",
      isWarmupCooldown: true,
      finalIntensity: getWarmupCooldownIntensity(),
    })
  }

  const renderWorkoutStructure = (items: typeof workout.items, depth = 0) => {
    return items.map((item) => (
      <div key={item.id} className={`${depth > 0 ? "ml-6 border-l-2 border-border pl-4" : ""}`}>
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg mb-2">
          {item.type === "set" ? (
            <>
              <div className="w-4 h-4 bg-accent rounded-full shadow-sm"></div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">세트</div>
                <div className="text-sm text-muted-foreground">{item.repetitions}회 반복</div>
              </div>
            </>
          ) : item.type === "rest" ? (
            <>
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${exerciseTypeColors[item.type]}`}
                  >
                    휴식
                  </div>
                  <span className="text-sm font-medium">{formatTimeShort(item.duration)}</span>
                </div>
                <div className="text-sm font-medium text-primary">
                  강도 {calculateFinalIntensity(item.type, item.intensity || "medium")}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${exerciseTypeColors[item.type]}`}
                  >
                    {exerciseTypeLabels[item.type]}
                  </div>
                  <span className="text-sm font-medium">{formatTimeShort(item.duration)}</span>
                </div>
                <div className="text-sm font-medium text-primary">
                  {getIntensityLabel(item.type, item.intensity || "medium")} · 강도{" "}
                  {calculateFinalIntensity(item.type, item.intensity || "medium")}
                </div>
              </div>
            </>
          )}
        </div>
        {item.type === "set" && item.items.length > 0 && (
          <div className="mb-2">{renderWorkoutStructure(item.items, depth + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  뒤로
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{workout.name}</h1>
                <p className="text-sm text-muted-foreground">{workout.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/edit/${workout.id}`}>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Edit className="w-4 h-4" />
                  수정
                </Button>
              </Link>
              <Link href={`/timer/${workout.id}`}>
                <Button className="gap-2">
                  <Play className="w-4 h-4" />
                  시작
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Timeline Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{formatTime(totalTime)}</div>
                  <div className="text-sm text-muted-foreground">총 시간</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{timelineData.length}</div>
                  <div className="text-sm text-muted-foreground">총 구간</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {Math.round(
                      timelineData.reduce((sum, item) => sum + item.finalIntensity * item.duration, 0) / totalTime,
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">평균 강도</div>
                </CardContent>
              </Card>
            </div>

            {/* Intensity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  훈련 강도 흐름
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chart */}
                  <div className="relative h-32 bg-muted rounded-lg overflow-visible">
                    <div className="absolute inset-0 flex items-end overflow-hidden rounded-lg">
                      {timelineData.map((item, index) => {
                        const width = (item.duration / totalTime) * 100
                        const maxIntensity = 5
                        const height = Math.max((item.finalIntensity / maxIntensity) * 100, 8) // 최소 8% 높이 보장
                        const colorClass = item.isWarmupCooldown
                          ? warmupCooldownColor
                          : exerciseTypeChartColors[item.type]
                        return (
                          <div
                            key={index}
                            className={`${colorClass} transition-all duration-200 hover:opacity-80 relative group`}
                            style={{
                              width: `${width}%`,
                              height: `${height}%`,
                            }}
                          >
                            {/* Tooltip */}
                            <div
                              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-gray-700 pointer-events-none"
                              style={{ zIndex: 2147483647, position: "fixed" }}
                            >
                              {item.name ||
                                (item.type === "rest"
                                  ? "휴식"
                                  : `${exerciseTypeLabels[item.type]} ${getIntensityLabel(item.type, item.intensity || "medium")}`)}{" "}
                              - {formatTimeShort(item.duration)} (강도 {item.finalIntensity})
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time markers */}
                  <div className="relative">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0:00</span>
                      <span>{formatTime(Math.floor(totalTime / 4))}</span>
                      <span>{formatTime(Math.floor(totalTime / 2))}</span>
                      <span>{formatTime(Math.floor((totalTime * 3) / 4))}</span>
                      <span>{formatTime(totalTime)}</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-sky-300 rounded"></div>
                      <span>웜업/쿨다운</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-pink-400 rounded"></div>
                      <span>달리기</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-300 rounded"></div>
                      <span>걷기</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                      <span>휴식</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  상세 타임라인
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timelineData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="text-sm font-mono text-muted-foreground min-w-[60px] bg-muted px-2 py-1 rounded">
                        {formatTime(item.startTime)}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${
                              item.isWarmupCooldown ? warmupCooldownBoxColor : exerciseTypeColors[item.type]
                            }`}
                          >
                            {item.name || (item.type === "rest" ? "휴식" : exerciseTypeLabels[item.type])}
                          </div>
                          <span className="text-sm font-medium">{formatTimeShort(item.duration)}</span>
                        </div>
                        <div className="text-sm font-medium text-primary">
                          {item.type !== "rest" && !item.isWarmupCooldown ? (
                            <>
                              {getIntensityLabel(item.type, item.intensity || "medium")} · 강도 {item.finalIntensity}
                            </>
                          ) : (
                            <>강도 {item.finalIntensity}</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workout Structure */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>훈련 구성</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Warmup */}
                  {workout.warmupTime > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${warmupCooldownBoxColor}`}
                          >
                            웜업
                          </div>
                          <span className="text-sm font-medium">{formatTimeShort(workout.warmupTime)}</span>
                        </div>
                        <div className="text-sm font-medium text-primary">강도 {getWarmupCooldownIntensity()}</div>
                      </div>
                    </div>
                  )}

                  {/* Main workout */}
                  <div className="space-y-2">{renderWorkoutStructure(workout.items)}</div>

                  {/* Cooldown */}
                  {workout.cooldownTime > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${warmupCooldownBoxColor}`}
                          >
                            쿨다운
                          </div>
                          <span className="text-sm font-medium">{formatTimeShort(workout.cooldownTime)}</span>
                        </div>
                        <div className="text-sm font-medium text-primary">강도 {getWarmupCooldownIntensity()}</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 실행</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/timer/${workout.id}`}>
                  <Button className="w-full gap-2" size="lg">
                    <Play className="w-5 h-5" />
                    타이머 시작
                  </Button>
                </Link>
                <Link href={`/edit/${workout.id}`}>
                  <Button variant="outline" className="w-full gap-2 bg-transparent">
                    <Edit className="w-5 h-5" />
                    훈련 수정
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
