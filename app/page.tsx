"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, Edit, Trash2, Clock } from "lucide-react"
import Link from "next/link"
import {
  getWorkouts,
  deleteWorkout,
  calculateTotalTime,
  countIntervals,
  initializeSampleData,
  type WorkoutPlan,
} from "@/lib/timer-storage"

export default function HomePage() {
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([])
  const [selectedTimer, setSelectedTimer] = useState<WorkoutPlan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load workouts on component mount
  useEffect(() => {
    initializeSampleData()
    setWorkouts(getWorkouts())
    setIsLoading(false)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}초`
    if (secs === 0) return `${mins}분`
    return `${mins}분 ${secs}초`
  }

  const handleTimerClick = (timer: WorkoutPlan) => {
    window.location.href = `/view/${timer.id}`
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedTimer(null)
  }

  const handleDeleteTimer = (e: React.MouseEvent, timerId: string) => {
    e.stopPropagation()
    if (confirm("정말로 이 타이머를 삭제하시겠습니까?")) {
      deleteWorkout(timerId)
      setWorkouts(getWorkouts())
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">인터벌 타이머</h1>
              <p className="text-sm text-muted-foreground">러닝 훈련을 위한 타이머</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {workouts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Clock className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">저장된 타이머가 없습니다</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              새로운 인터벌 타이머를 만들어 러닝 훈련을 시작해보세요. 우측 하단의 + 버튼을 눌러 첫 번째 타이머를 추가할
              수 있습니다.
            </p>
            <Link href="/create">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />첫 타이머 만들기
              </Button>
            </Link>
          </div>
        ) : (
          /* Timer List */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">저장된 타이머</h2>
              <p className="text-sm text-muted-foreground">{workouts.length}개의 타이머</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workouts.map((timer) => (
                <Card
                  key={timer.id}
                  className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-border"
                  onClick={() => handleTimerClick(timer)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-card-foreground">{timer.name}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                          {timer.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/timer/${timer.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-600 hover:bg-green-50"
                            onClick={(e) => e.stopPropagation()}
                            title="바로 시작"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/edit/${timer.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteTimer(e, timer.id)}
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          총 시간:{" "}
                          <span className="font-medium text-foreground">{formatTime(calculateTotalTime(timer))}</span>
                        </span>
                        <span className="text-muted-foreground">
                          구간: <span className="font-medium text-foreground">{countIntervals(timer)}개</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Link href="/create">
          <Button size="lg" className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200">
            <Plus className="w-6 h-6" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
