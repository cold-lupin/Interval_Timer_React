"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Play, Pause, Square, SkipForward } from "lucide-react"
import Link from "next/link"
import {
  getWorkout,
  flattenWorkout,
  getIntensityLabel,
  type WorkoutPlan,
  type ExerciseType,
  type Exercise,
} from "@/lib/timer-storage"

interface TimerExercise extends Exercise {
  startTime: number
  endTime: number
}

type TimerState = "ready" | "countdown-start" | "countdown-transition" | "running" | "paused" | "completed"
type ExerciseStatus = "pending" | "running" | "completed" | "skipped"

const exerciseTypeLabels: Record<ExerciseType, string> = {
  running: "달리기",
  walking: "걷기",
  rest: "휴식",
}

const exerciseTypeColors: Record<ExerciseType, string> = {
  running: "bg-pink-400",
  walking: "bg-green-300",
  rest: "bg-yellow-200",
}

const exerciseTypeBackgrounds: Record<ExerciseType, string> = {
  running: "bg-pink-50",
  walking: "bg-green-50",
  rest: "bg-yellow-50",
}

export default function TimerPage({ params }: { params: { id: string } }) {
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timerState, setTimerState] = useState<TimerState>("ready")
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [totalElapsedTime, setTotalElapsedTime] = useState(0)
  const [countdownValue, setCountdownValue] = useState(0)
  const [nextExerciseIndex, setNextExerciseIndex] = useState(0)
  const [exerciseStatuses, setExerciseStatuses] = useState<ExerciseStatus[]>([])
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [currentExerciseElapsed, setCurrentExerciseElapsed] = useState(0)
  const [exerciseElapsedTimes, setExerciseElapsedTimes] = useState<number[]>([])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentExerciseStartRef = useRef<number>(0)

  const playBeep = (frequency = 800, duration = 200) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration / 1000)
    } catch (error) {
      console.log("[v0] Audio not supported:", error)
    }
  }

  const startCountdown = (type: "start" | "transition", targetIndex?: number) => {
    const countdownDuration = type === "start" ? 5 : 3
    setCountdownValue(countdownDuration)
    setTimerState(type === "start" ? "countdown-start" : "countdown-transition")

    if (targetIndex !== undefined) {
      setNextExerciseIndex(targetIndex)
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdownValue((prev) => {
        const newValue = prev - 1

        // 비프음 재생
        if (newValue > 0) {
          playBeep(800, 200)
        } else {
          playBeep(1000, 400) // 시작 시 더 높은 음
        }

        if (newValue <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
          }

          if (type === "start") {
            // 운동 시작
            const now = Date.now()
            startTimeRef.current = now
            currentExerciseStartRef.current = now
            pausedTimeRef.current = 0
            setCurrentExerciseElapsed(0)
            setTimerState("running")
          } else {
            // 다음 운동으로 전환
            setCurrentExerciseIndex(targetIndex!)
            const now = Date.now()
            startTimeRef.current = now
            currentExerciseStartRef.current = now
            pausedTimeRef.current = totalElapsedTime
            setCurrentExerciseElapsed(0)
            setTimerState("running")
          }
        }

        return newValue
      })
    }, 1000)
  }

  useEffect(() => {
    const loadWorkout = () => {
      const loadedWorkout = getWorkout(params.id)
      setWorkout(loadedWorkout)
      setIsLoading(false)
    }

    loadWorkout()
  }, [params.id])

  useEffect(() => {
    if (!workout) return

    const flattenedWorkout = flattenWorkout(workout.items)
    const completeTimeline: TimerExercise[] = []
    let timelineCurrentTime = 0

    // Add warmup
    if (workout.warmupTime > 0) {
      completeTimeline.push({
        id: "warmup",
        type: "walking",
        duration: workout.warmupTime,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + workout.warmupTime,
        name: "웜업",
      })
      timelineCurrentTime += workout.warmupTime
    }

    // Add main workout
    flattenedWorkout.forEach((item) => {
      completeTimeline.push({
        ...item,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + item.duration,
      })
      timelineCurrentTime += item.duration
    })

    // Add cooldown
    if (workout.cooldownTime > 0) {
      completeTimeline.push({
        id: "cooldown",
        type: "walking",
        duration: workout.cooldownTime,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + workout.cooldownTime,
        name: "쿨다운",
      })
    }

    // 운동 상태 초기화
    const initialStatuses: ExerciseStatus[] = completeTimeline.map((_, index) => (index === 0 ? "running" : "pending"))
    setExerciseStatuses(initialStatuses)
    // 운동별 진행 시간 초기화
    setExerciseElapsedTimes(completeTimeline.map(() => 0))
  }, [workout])

  useEffect(() => {
    if (!workout) return

    const flattenedWorkout = flattenWorkout(workout.items)
    const completeTimeline: TimerExercise[] = []
    let timelineCurrentTime = 0

    // Add warmup
    if (workout.warmupTime > 0) {
      completeTimeline.push({
        id: "warmup",
        type: "walking",
        duration: workout.warmupTime,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + workout.warmupTime,
        name: "웜업",
      })
      timelineCurrentTime += workout.warmupTime
    }

    // Add main workout
    flattenedWorkout.forEach((item) => {
      completeTimeline.push({
        ...item,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + item.duration,
      })
      timelineCurrentTime += item.duration
    })

    // Add cooldown
    if (workout.cooldownTime > 0) {
      completeTimeline.push({
        id: "cooldown",
        type: "walking",
        duration: workout.cooldownTime,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + workout.cooldownTime,
        name: "쿨다운",
      })
    }

    const currentExercise = completeTimeline[currentExerciseIndex]

    if (timerState === "running" && currentExercise) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current
        const currentElapsed = Math.floor((now - currentExerciseStartRef.current) / 1000)
        const currentRemaining = currentExercise.duration - currentElapsed

        setTotalElapsedTime(elapsed)
        setCurrentExerciseElapsed(currentElapsed)
        setRemainingTime(Math.max(0, currentRemaining))

        if (currentRemaining === 3 || currentRemaining === 2 || currentRemaining === 1) {
          playBeep(600, 150)
        }

        // Check if current exercise is completed
        if (currentRemaining <= 0) {
          setExerciseStatuses((prev) => {
            const newStatuses = [...prev]
            newStatuses[currentExerciseIndex] = "completed"
            if (currentExerciseIndex + 1 < newStatuses.length) {
              newStatuses[currentExerciseIndex + 1] = "running"
            }
            return newStatuses
          })

          if (currentExerciseIndex < completeTimeline.length - 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            startCountdown("transition", currentExerciseIndex + 1)
          } else {
            // Workout completed
            setTimerState("completed")
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
          }
        }
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [workout, timerState, currentExerciseIndex])

  useEffect(() => {
    if (!workout) return

    const flattenedWorkout = flattenWorkout(workout.items)
    const completeTimeline: TimerExercise[] = []
    let timelineCurrentTime = 0

    // Add warmup
    if (workout.warmupTime > 0) {
      completeTimeline.push({
        id: "warmup",
        type: "walking",
        duration: workout.warmupTime,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + workout.warmupTime,
        name: "웜업",
      })
      timelineCurrentTime += workout.warmupTime
    }

    // Add main workout
    flattenedWorkout.forEach((item) => {
      completeTimeline.push({
        ...item,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + item.duration,
      })
      timelineCurrentTime += item.duration
    })

    // Add cooldown
    if (workout.cooldownTime > 0) {
      completeTimeline.push({
        id: "cooldown",
        type: "walking",
        duration: workout.cooldownTime,
        startTime: timelineCurrentTime,
        endTime: timelineCurrentTime + workout.cooldownTime,
        name: "쿨다운",
      })
    }

    const currentExercise = completeTimeline[currentExerciseIndex]
    if (currentExercise) {
      setRemainingTime(currentExercise.duration)
      if (timerState === "running") {
        currentExerciseStartRef.current = Date.now()
      }
    }
  }, [workout, currentExerciseIndex])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getExerciseColor = (exercise: TimerExercise) => {
    if (exercise.id === "warmup" || exercise.id === "cooldown") {
      return "bg-sky-300"
    }
    return exerciseTypeColors[exercise.type]
  }

  const getExerciseBackground = (exercise: TimerExercise) => {
    if (exercise.id === "warmup" || exercise.id === "cooldown") {
      return "bg-sky-50"
    }
    return exerciseTypeBackgrounds[exercise.type]
  }

  const getStatusIcon = (status: ExerciseStatus) => {
    switch (status) {
      case "completed":
        return "●"
      case "skipped":
        return "◎"
      case "running":
        return "○"
      default:
        return "○"
    }
  }

  const getStatusStyle = (status: ExerciseStatus) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "skipped":
        return "text-orange-500 line-through"
      case "running":
        return "text-blue-600 font-semibold"
      default:
        return "text-muted-foreground"
    }
  }

  const handleStop = () => {
    if (timerState === "running" || timerState === "paused") {
      setShowStopConfirm(true)
    } else {
      confirmStop()
    }
  }

  const confirmStop = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    setTimerState("ready")
    setCurrentExerciseIndex(0)
    setRemainingTime(completeTimeline[0]?.duration || 0)
    setTotalElapsedTime(0)
    setCurrentExerciseElapsed(0)
    setExerciseElapsedTimes([])
    pausedTimeRef.current = 0
    setShowStopConfirm(false)

    // 운동 상태 초기화
    setExerciseStatuses((prev) => prev.map((_, index) => (index === 0 ? "running" : "pending")))
  }

  const handleSkip = () => {
    if (currentExerciseIndex < completeTimeline.length - 1) {
      setExerciseElapsedTimes((prev) => {
        const newTimes = [...prev]
        newTimes[currentExerciseIndex] = currentExerciseElapsed
        return newTimes
      })

      setExerciseStatuses((prev) => {
        const newStatuses = [...prev]
        newStatuses[currentExerciseIndex] = "skipped"
        if (currentExerciseIndex + 1 < newStatuses.length) {
          newStatuses[currentExerciseIndex + 1] = "running"
        }
        return newStatuses
      })

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      const nextIndex = currentExerciseIndex + 1
      const nextEx = completeTimeline[nextIndex]
      setTotalElapsedTime(currentExercise.endTime)
      pausedTimeRef.current = currentExercise.endTime
      startCountdown("transition", nextIndex)
    }
  }

  const handleStart = () => {
    if (timerState === "ready") {
      startCountdown("start")
    } else if (timerState === "paused") {
      const now = Date.now()
      startTimeRef.current = now
      currentExerciseStartRef.current = now - currentExerciseElapsed * 1000
      setTimerState("running")
    }
  }

  const handlePause = () => {
    if (timerState === "running") {
      pausedTimeRef.current = totalElapsedTime
      setTimerState("paused")
    }
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
          <p className="text-muted-foreground">요청하신 타이머가 존재하지 않거나 삭제되었습니다.</p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  const flattenedWorkout = flattenWorkout(workout.items)
  const completeTimeline: TimerExercise[] = []
  let timelineCurrentTime = 0

  // Add warmup
  if (workout.warmupTime > 0) {
    completeTimeline.push({
      id: "warmup",
      type: "walking",
      duration: workout.warmupTime,
      startTime: timelineCurrentTime,
      endTime: timelineCurrentTime + workout.warmupTime,
      name: "웜업",
    })
    timelineCurrentTime += workout.warmupTime
  }

  // Add main workout
  flattenedWorkout.forEach((item) => {
    completeTimeline.push({
      ...item,
      startTime: timelineCurrentTime,
      endTime: timelineCurrentTime + item.duration,
    })
    timelineCurrentTime += item.duration
  })

  // Add cooldown
  if (workout.cooldownTime > 0) {
    completeTimeline.push({
      id: "cooldown",
      type: "walking",
      duration: workout.cooldownTime,
      startTime: timelineCurrentTime,
      endTime: timelineCurrentTime + workout.cooldownTime,
      name: "쿨다운",
    })
  }

  const totalTime = completeTimeline.reduce((sum, item) => sum + item.duration, 0)
  const currentExercise = completeTimeline[currentExerciseIndex]
  const nextExercise = completeTimeline[currentExerciseIndex + 1]

  if (timerState === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">훈련 완료!</h1>
            <p className="text-muted-foreground">{workout.name} 훈련을 성공적으로 완료했습니다.</p>
            <p className="text-sm text-muted-foreground mt-2">총 소요 시간: {formatTime(totalTime)}</p>
          </div>
          <div className="space-y-3">
            <Button onClick={handleStop} className="w-full" size="lg">
              다시 시작
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full bg-transparent">
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (timerState === "countdown-start" || timerState === "countdown-transition") {
    const targetExercise = timerState === "countdown-start" ? currentExercise : completeTimeline[nextExerciseIndex]

    return (
      <div
        className={`min-h-screen transition-colors duration-500 ${targetExercise ? getExerciseBackground(targetExercise) : "bg-background"} flex items-center justify-center`}
      >
        <div className="text-center space-y-8 max-w-md mx-auto px-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">
              {timerState === "countdown-start" ? "곧 시작합니다" : "다음 운동"}
            </h2>
            {targetExercise && (
              <div
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-white ${getExerciseColor(targetExercise)}`}
              >
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <span className="font-medium text-lg">
                  {targetExercise.name || exerciseTypeLabels[targetExercise.type]}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="text-8xl font-bold text-primary font-mono animate-pulse">
              {countdownValue > 0 ? countdownValue : "시작!"}
            </div>
            {countdownValue === 0 && <div className="text-2xl font-semibold text-green-600 animate-bounce">시작!</div>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${currentExercise ? getExerciseBackground(currentExercise) : "bg-background"}`}
    >
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/view/${workout.id}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  뒤로
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">{workout.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {currentExerciseIndex + 1} / {completeTimeline.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{Math.round((totalElapsedTime / totalTime) * 100)}%</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          {/* Combined Overall Progress and Current Exercise */}
          {currentExercise && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Overall Progress */}
                  <div className="space-y-4 text-center">
                    <Progress value={(totalElapsedTime / totalTime) * 100} className="h-3" />
                    <div className="text-2xl font-bold text-foreground font-mono">
                      {formatTime(totalElapsedTime)} / {formatTime(totalTime)}
                    </div>
                  </div>

                  {/* Current Exercise Info */}
                  <div className="flex items-center justify-between">
                    {/* 왼쪽: 현재 훈련 정보 */}
                    <div className="text-left space-y-1">
                      <div className="text-2xl font-bold text-foreground">
                        {currentExercise.name || exerciseTypeLabels[currentExercise.type]}
                      </div>
                      {currentExercise.type !== "rest" && (
                        <div className="text-lg text-muted-foreground">
                          {currentExercise.intensity
                            ? getIntensityLabel(currentExercise.type, currentExercise.intensity)
                            : "보통"}
                        </div>
                      )}
                    </div>

                    {/* 오른쪽: 남은 시간 */}
                    <div className="text-right">
                      <div className="text-6xl font-bold text-foreground font-mono">{formatTime(remainingTime)}</div>
                    </div>
                  </div>

                  {nextExercise && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>다음:</span>
                        <div className={`w-2 h-2 rounded-full ${getExerciseColor(nextExercise)}`}></div>
                        <span className="font-medium">
                          {nextExercise.name || exerciseTypeLabels[nextExercise.type]}
                        </span>
                        {nextExercise.type !== "rest" && nextExercise.intensity && (
                          <span className="text-xs">
                            {getIntensityLabel(nextExercise.type, nextExercise.intensity)}
                          </span>
                        )}
                        <span>{formatTime(nextExercise.duration)}</span>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    {timerState === "ready" && (
                      <Button onClick={handleStart} size="lg" className="gap-2 px-8">
                        <Play className="w-5 h-5" />
                        시작
                      </Button>
                    )}

                    {timerState === "running" && (
                      <>
                        <Button onClick={handlePause} size="lg" className="gap-2 px-6">
                          <Pause className="w-5 h-5" />
                          일시정지
                        </Button>
                        <Button onClick={handleStop} variant="outline" size="lg" className="gap-2 px-6 bg-transparent">
                          <Square className="w-5 h-5" />
                          정지
                        </Button>
                        {nextExercise && (
                          <Button onClick={handleSkip} variant="ghost" size="lg" className="gap-2 px-6">
                            <SkipForward className="w-5 h-5" />
                            건너뛰기
                          </Button>
                        )}
                      </>
                    )}

                    {timerState === "paused" && (
                      <>
                        <Button onClick={handleStart} size="lg" className="gap-2 px-6">
                          <Play className="w-5 h-5" />
                          계속
                        </Button>
                        <Button onClick={handleStop} variant="outline" size="lg" className="gap-2 px-6 bg-transparent">
                          <Square className="w-5 h-5" />
                          정지
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className="font-medium text-foreground">훈련 구성</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {completeTimeline.map((exercise, index) => {
                    const status = exerciseStatuses[index] || "pending"
                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center text-sm py-1">
                        {/* 훈련상태 */}
                        <div className="col-span-1">
                          <span className={`font-mono ${getStatusStyle(status)}`}>{getStatusIcon(status)}</span>
                        </div>

                        {/* 훈련종류 */}
                        <div className="col-span-3">
                          <span className={getStatusStyle(status)}>
                            {exercise.name || exerciseTypeLabels[exercise.type]}
                          </span>
                        </div>

                        {/* 훈련강도 */}
                        <div className="col-span-3">
                          {exercise.type !== "rest" && (
                            <span className={`text-xs ${getStatusStyle(status)}`}>
                              {exercise.intensity ? getIntensityLabel(exercise.type, exercise.intensity) : "보통"}
                            </span>
                          )}
                        </div>

                        {/* 완료여부 */}
                        <div className="col-span-2">
                          <span className={`text-xs ${getStatusStyle(status)}`}>
                            {status === "skipped" && formatTime(exerciseElapsedTimes[index] || 0)}
                            {status === "completed" && "완료"}
                            {status === "running" && "진행중"}
                            {status === "pending" && ""}
                          </span>
                        </div>

                        {/* 훈련시간 */}
                        <div className="col-span-3 text-right">
                          <span className={`font-mono ${getStatusStyle(status)}`}>{formatTime(exercise.duration)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {showStopConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-80 mx-4">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-lg font-semibold">훈련을 멈추시겠습니까?</h3>
              <p className="text-sm text-muted-foreground">현재 진행 상황이 초기화됩니다.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowStopConfirm(false)}>
                  취소
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmStop}>
                  정지
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
