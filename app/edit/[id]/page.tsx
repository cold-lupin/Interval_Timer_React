"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  getWorkout,
  updateWorkout,
  generateId,
  type ExerciseType,
  type Exercise,
  type Set,
  type WorkoutItem,
  type WorkoutPlan,
  type ExerciseIntensity,
} from "@/lib/timer-storage"

const exerciseTypeLabels: Record<ExerciseType, string> = {
  running: "달리기",
  walking: "걷기",
  rest: "휴식",
}

const intensityLabels: Record<ExerciseIntensity, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
}

const getIntensityOptions = (type: ExerciseType): { value: ExerciseIntensity; label: string }[] => {
  switch (type) {
    case "walking":
      return [
        { value: "low", label: "천천히" },
        { value: "medium", label: "보통" },
        { value: "high", label: "빠르게" },
      ]
    case "running":
      return [
        { value: "low", label: "조깅" },
        { value: "medium", label: "보통" },
        { value: "high", label: "전속력" },
      ]
    case "rest":
      return [{ value: "low", label: "휴식" }]
    default:
      return [
        { value: "low", label: "낮음" },
        { value: "medium", label: "보통" },
        { value: "high", label: "높음" },
      ]
  }
}

const exerciseTypeColors: Record<ExerciseType, string> = {
  running: "bg-red-100 text-red-800 border-red-200",
  walking: "bg-blue-100 text-blue-800 border-blue-200",
  rest: "bg-gray-100 text-gray-800 border-gray-200",
}

export default function EditTimerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<{
    type?: ExerciseType
    duration?: number
    repetitions?: number
    intensity?: ExerciseIntensity
  }>({})

  useEffect(() => {
    const loadWorkout = () => {
      const loadedWorkout = getWorkout(params.id)
      if (loadedWorkout) {
        setWorkout(loadedWorkout)
      }
      setIsLoading(false)
    }

    loadWorkout()
  }, [params.id])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const updateItem = (itemId: string, updates: Partial<Exercise | Set>) => {
    if (!workout) return

    const updateInItems = (items: WorkoutItem[]): WorkoutItem[] => {
      return items.map((item) => {
        if (item.id === itemId) {
          return { ...item, ...updates }
        } else if (item.type === "set") {
          return {
            ...item,
            items: updateInItems(item.items),
          }
        }
        return item
      })
    }

    setWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: updateInItems(prev.items),
      }
    })
  }

  const startEditing = (item: WorkoutItem) => {
    setEditingItemId(item.id)
    if (item.type === "set") {
      setEditingValues({ repetitions: item.repetitions })
    } else {
      setEditingValues({
        type: item.type,
        duration: item.duration,
        intensity: item.intensity || "medium",
      })
    }
  }

  const saveEdit = () => {
    if (editingItemId && Object.keys(editingValues).length > 0) {
      updateItem(editingItemId, editingValues)
    }
    setEditingItemId(null)
    setEditingValues({})
  }

  const cancelEdit = () => {
    setEditingItemId(null)
    setEditingValues({})
  }

  const addExercise = (type: ExerciseType, duration: number, intensity: ExerciseIntensity, parentId?: string) => {
    if (!workout) return

    const newExercise: Exercise = {
      id: generateId(),
      type,
      duration,
      intensity,
    }

    if (parentId) {
      setWorkout((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: addToParent(prev.items, parentId, newExercise),
        }
      })
    } else {
      setWorkout((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: [...prev.items, newExercise],
        }
      })
    }
  }

  const addSet = (repetitions: number, parentId?: string) => {
    if (!workout) return

    const newSet: Set = {
      id: generateId(),
      type: "set",
      repetitions,
      items: [],
    }

    if (parentId) {
      setWorkout((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: addToParent(prev.items, parentId, newSet),
        }
      })
    } else {
      setWorkout((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: [...prev.items, newSet],
        }
      })
    }
  }

  const addToParent = (items: WorkoutItem[], parentId: string, newItem: WorkoutItem): WorkoutItem[] => {
    return items.map((item) => {
      if (item.id === parentId && item.type === "set") {
        return {
          ...item,
          items: [...item.items, newItem],
        }
      } else if (item.type === "set") {
        return {
          ...item,
          items: addToParent(item.items, parentId, newItem),
        }
      }
      return item
    })
  }

  const removeItem = (itemId: string) => {
    if (!workout) return

    const removeFromItems = (items: WorkoutItem[]): WorkoutItem[] => {
      return items
        .filter((item) => item.id !== itemId)
        .map((item) => {
          if (item.type === "set") {
            return {
              ...item,
              items: removeFromItems(item.items),
            }
          }
          return item
        })
    }

    setWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: removeFromItems(prev.items),
      }
    })
  }

  const moveItem = (itemId: string, direction: "up" | "down") => {
    if (!workout) return

    const moveInItems = (items: WorkoutItem[]): WorkoutItem[] => {
      const index = items.findIndex((item) => item.id === itemId)
      if (index === -1) {
        return items.map((item) => {
          if (item.type === "set") {
            return {
              ...item,
              items: moveInItems(item.items),
            }
          }
          return item
        })
      }

      const newItems = [...items]
      if (direction === "up" && index > 0) {
        ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
      } else if (direction === "down" && index < items.length - 1) {
        ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
      }
      return newItems
    }

    setWorkout((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: moveInItems(prev.items),
      }
    })
  }

  const handleSave = async () => {
    if (!workout) return

    console.log("[v0] 저장 시작, workout:", workout)

    if (!workout.name.trim()) {
      console.log("[v0] 운동 이름이 비어있음")
      alert("운동 이름을 입력해주세요.")
      return
    }

    if (workout.items.length === 0) {
      console.log("[v0] 훈련 항목이 없음")
      alert("최소 하나의 훈련을 추가해주세요.")
      return
    }

    setIsSaving(true)
    try {
      console.log("[v0] updateWorkout 호출 전")
      const updatedWorkout = updateWorkout(workout)
      console.log("[v0] updateWorkout 결과:", updatedWorkout)

      if (updatedWorkout) {
        console.log("[v0] 저장 성공, 페이지 이동")
        router.push(`/view/${workout.id}`)
      } else {
        console.log("[v0] updateWorkout이 null/undefined 반환")
        alert("저장 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error("[v0] 저장 중 오류:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const renderWorkoutItem = (item: WorkoutItem, depth = 0, parentId?: string) => {
    const isSet = item.type === "set"
    const isEditing = editingItemId === item.id

    return (
      <div key={item.id} className={`${depth > 0 ? "ml-6 border-l-2 border-border pl-4" : ""}`}>
        <Card className="mb-2">
          <CardContent className="p-3">
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isSet ? (
                    <>
                      <div className="w-3 h-3 bg-accent rounded-full"></div>
                      <span className="font-medium">세트</span>
                      <span>/</span>
                      <Input
                        type="number"
                        min="1"
                        value={editingValues.repetitions || 1}
                        onChange={(e) =>
                          setEditingValues((prev) => ({
                            ...prev,
                            repetitions: Number.parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-16 h-8"
                        autoFocus
                      />
                      <span className="text-sm text-muted-foreground">회 반복</span>
                    </>
                  ) : (
                    <>
                      <Select
                        value={editingValues.type || "running"}
                        onValueChange={(value: ExerciseType) =>
                          setEditingValues((prev) => ({
                            ...prev,
                            type: value,
                            intensity: value === "rest" ? "low" : "medium",
                          }))
                        }
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="running">달리기</SelectItem>
                          <SelectItem value="walking">걷기</SelectItem>
                          <SelectItem value="rest">휴식</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={editingValues.intensity || "medium"}
                        onValueChange={(value: ExerciseIntensity) =>
                          setEditingValues((prev) => ({ ...prev, intensity: value }))
                        }
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getIntensityOptions(editingValues.type || "running").map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>/</span>
                      <Input
                        type="number"
                        min="1"
                        value={editingValues.duration || 60}
                        onChange={(e) =>
                          setEditingValues((prev) => ({
                            ...prev,
                            duration: Number.parseInt(e.target.value) || 1,
                          }))
                        }
                        className="w-16 h-8"
                      />
                      <span className="text-sm text-muted-foreground">초</span>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-green-600" onClick={saveEdit}>
                    확인
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-red-600" onClick={cancelEdit}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                    onClick={() => startEditing(item)}
                  >
                    {isSet ? (
                      <>
                        <div className="w-3 h-3 bg-accent rounded-full"></div>
                        <span className="font-medium">세트</span>
                        <span>/</span>
                        <span className="text-sm text-muted-foreground">{item.repetitions}회 반복</span>
                      </>
                    ) : (
                      <>
                        <div
                          className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${exerciseTypeColors[item.type]}`}
                        >
                          {exerciseTypeLabels[item.type]}
                        </div>
                        <span className="text-sm font-medium">
                          {
                            getIntensityOptions(item.type).find((opt) => opt.value === (item.intensity || "medium"))
                              ?.label
                          }
                        </span>
                        <span>/</span>
                        <span className="font-medium">{formatTime(item.duration)}</span>
                      </>
                    )}
                  </div>
                  {isSet && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => {
                        setCurrentParentId(item.id)
                        setIsAddDialogOpen(true)
                      }}
                    >
                      추가
                    </Button>
                  )}
                </div>
                <div className="flex justify-end gap-1">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => moveItem(item.id, "up")}>
                      ▲ 위
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => moveItem(item.id, "down")}>
                      ▼ 아래
                    </Button>
                  </div>
                  <div className="ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isSet && item.items.length > 0 && (
          <div className="mb-2">{item.items.map((subItem) => renderWorkoutItem(subItem, depth + 1, item.id))}</div>
        )}
      </div>
    )
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/view/${workout.id}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  뒤로
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">타이머 수정</h1>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workout-name">운동 이름</Label>
                <Input
                  id="workout-name"
                  placeholder="예: HIIT 러닝"
                  value={workout.name}
                  onChange={(e) => setWorkout((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                />
              </div>

              <div>
                <Label htmlFor="workout-description">설명 (선택사항)</Label>
                <Input
                  id="workout-description"
                  placeholder="예: 고강도 인터벌 훈련"
                  value={workout.description}
                  onChange={(e) => setWorkout((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warmup">웜업 시간 (분)</Label>
                  <Input
                    id="warmup"
                    type="number"
                    min="0"
                    value={Math.floor(workout.warmupTime / 60)}
                    onChange={(e) =>
                      setWorkout((prev) =>
                        prev
                          ? {
                              ...prev,
                              warmupTime: Number.parseInt(e.target.value) * 60 || 0,
                            }
                          : prev,
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cooldown">쿨다운 시간 (분)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    min="0"
                    value={Math.floor(workout.cooldownTime / 60)}
                    onChange={(e) =>
                      setWorkout((prev) =>
                        prev
                          ? {
                              ...prev,
                              cooldownTime: Number.parseInt(e.target.value) * 60 || 0,
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>훈련 구성</CardTitle>
                <Button
                  onClick={() => {
                    setCurrentParentId(null)
                    setIsAddDialogOpen(true)
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workout.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="mb-4">아직 훈련이 추가되지 않았습니다.</p>
                  <p className="text-sm">위의 "추가" 버튼을 눌러 첫 번째 훈련을 만들어보세요.</p>
                </div>
              ) : (
                <div className="space-y-1">{workout.items.map((item) => renderWorkoutItem(item))}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentParentId ? "세트에 추가" : "새 항목 추가"}</DialogTitle>
            <DialogDescription>훈련 또는 세트를 추가할 수 있습니다.</DialogDescription>
          </DialogHeader>

          <AddItemForm
            onAddExercise={(type, duration, intensity) => {
              addExercise(type, duration, intensity, currentParentId || undefined)
              setIsAddDialogOpen(false)
            }}
            onAddSet={(repetitions) => {
              addSet(repetitions, currentParentId || undefined)
              setIsAddDialogOpen(false)
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddItemForm({
  onAddExercise,
  onAddSet,
  onCancel,
}: {
  onAddExercise: (type: ExerciseType, duration: number, intensity: ExerciseIntensity) => void
  onAddSet: (repetitions: number) => void
  onCancel: () => void
}) {
  const [itemType, setItemType] = useState<"exercise" | "set">("exercise")
  const [exerciseType, setExerciseType] = useState<ExerciseType>("running")
  const [duration, setDuration] = useState(60)
  const [repetitions, setRepetitions] = useState(3)
  const [intensity, setIntensity] = useState<ExerciseIntensity>("medium")

  const handleSubmit = () => {
    if (itemType === "exercise") {
      onAddExercise(exerciseType, duration, intensity)
    } else {
      onAddSet(repetitions)
    }
  }

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: "1", minWidth: "160px" }}>
          <Label>추가할 항목</Label>
          <Select value={itemType} onValueChange={(value: "exercise" | "set") => setItemType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exercise">훈련</SelectItem>
              <SelectItem value="set">세트</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {itemType === "exercise" && (
          <div style={{ flex: "1", minWidth: "160px" }}>
            <Label>운동 종류</Label>
            <Select
              value={exerciseType}
              onValueChange={(value: ExerciseType) => {
                setExerciseType(value)
                setIntensity(value === "rest" ? "low" : "medium")
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">달리기</SelectItem>
                <SelectItem value="walking">걷기</SelectItem>
                <SelectItem value="rest">휴식</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {itemType === "exercise" ? (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <Label>강도</Label>
            <Select value={intensity} onValueChange={(value: ExerciseIntensity) => setIntensity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getIntensityOptions(exerciseType).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ flex: "1", minWidth: "160px" }}>
            <Label>시간 (초)</Label>
            <Input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(Number.parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
      ) : (
        <div>
          <Label>반복 횟수</Label>
          <Input
            type="number"
            min="1"
            value={repetitions}
            onChange={(e) => setRepetitions(Number.parseInt(e.target.value) || 1)}
          />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSubmit} className="flex-1">
          추가
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          취소
        </Button>
      </div>
    </div>
  )
}
