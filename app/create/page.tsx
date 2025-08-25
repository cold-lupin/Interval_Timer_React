"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Check, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createWorkout,
  generateId,
  getIntensityLabel,
  type ExerciseType,
  type IntensityLevel,
  type Exercise,
  type Set,
  type Rest,
  type WorkoutItem,
} from "@/lib/timer-storage"

interface WorkoutPlan {
  name: string
  description: string
  warmupTime: number // seconds
  cooldownTime: number // seconds
  items: WorkoutItem[]
}

const exerciseTypeLabels: Record<ExerciseType, string> = {
  running: "달리기",
  walking: "걷기",
}

const exerciseTypeColors: Record<ExerciseType, string> = {
  running: "bg-pink-100 text-pink-800 border-pink-200",
  walking: "bg-green-100 text-green-800 border-green-200",
}

const restColor = "bg-yellow-100 text-yellow-800 border-yellow-200"

const intensityOptions: Record<ExerciseType, { value: IntensityLevel; label: string }[]> = {
  walking: [
    { value: "low", label: "천천히" },
    { value: "medium", label: "보통" },
    { value: "high", label: "빠르게" },
  ],
  running: [
    { value: "low", label: "조깅" },
    { value: "medium", label: "보통" },
    { value: "high", label: "전속력" },
  ],
}

export default function CreateTimerPage() {
  const router = useRouter()
  const [workout, setWorkout] = useState<WorkoutPlan>({
    name: "",
    description: "",
    warmupTime: 300, // 5 minutes
    cooldownTime: 300, // 5 minutes
    items: [],
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<{
    type?: ExerciseType
    intensity?: IntensityLevel
    duration?: number
    repetitions?: number
  }>({})

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const updateItem = (itemId: string, updates: Partial<Exercise | Set | Rest>) => {
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

    setWorkout((prev) => ({
      ...prev,
      items: updateInItems(prev.items),
    }))
  }

  const startEditing = (item: WorkoutItem) => {
    setEditingItemId(item.id)
    if (item.type === "set") {
      setEditingValues({ repetitions: item.repetitions })
    } else if (item.type === "rest") {
      setEditingValues({ duration: item.duration })
    } else {
      setEditingValues({
        type: item.type,
        intensity: item.intensity || "medium",
        duration: item.duration,
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

  const addExercise = (type: ExerciseType, intensity: IntensityLevel, duration: number, parentId?: string) => {
    const newExercise: Exercise = {
      id: generateId(),
      type,
      intensity,
      duration,
    }

    if (parentId) {
      setWorkout((prev) => ({
        ...prev,
        items: addToParent(prev.items, parentId, newExercise),
      }))
    } else {
      setWorkout((prev) => ({
        ...prev,
        items: [...prev.items, newExercise],
      }))
    }
  }

  const addRest = (duration: number, parentId?: string) => {
    const newRest: Rest = {
      id: generateId(),
      type: "rest",
      duration,
    }

    if (parentId) {
      setWorkout((prev) => ({
        ...prev,
        items: addToParent(prev.items, parentId, newRest),
      }))
    } else {
      setWorkout((prev) => ({
        ...prev,
        items: [...prev.items, newRest],
      }))
    }
  }

  const addSet = (repetitions: number, parentId?: string) => {
    const newSet: Set = {
      id: generateId(),
      type: "set",
      repetitions,
      items: [],
    }

    if (parentId) {
      setWorkout((prev) => ({
        ...prev,
        items: addToParent(prev.items, parentId, newSet),
      }))
    } else {
      setWorkout((prev) => ({
        ...prev,
        items: [...prev.items, newSet],
      }))
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

    setWorkout((prev) => ({
      ...prev,
      items: removeFromItems(prev.items),
    }))
  }

  const moveItem = (itemId: string, direction: "up" | "down") => {
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

    setWorkout((prev) => ({
      ...prev,
      items: moveInItems(prev.items),
    }))
  }

  const handleSave = async () => {
    if (!workout.name.trim()) {
      alert("운동 이름을 입력해주세요.")
      return
    }

    if (workout.items.length === 0) {
      alert("최소 하나의 훈련을 추가해주세요.")
      return
    }

    setIsSaving(true)
    try {
      const savedWorkout = createWorkout(workout)
      router.push(`/view/${savedWorkout.id}`)
    } catch (error) {
      console.error("Error saving workout:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const renderWorkoutItem = (item: WorkoutItem, depth = 0, parentId?: string) => {
    const isSet = item.type === "set"
    const isRest = item.type === "rest"
    const isEditing = editingItemId === item.id

    return (
      <div key={item.id} className={`${depth > 0 ? "ml-6 border-l-2 border-border pl-4" : ""}`}>
        <Card className="mb-2">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isEditing ? (
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
                      ) : isRest ? (
                        <>
                          <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${restColor}`}>
                            휴식
                          </div>
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
                            autoFocus
                          />
                          <span className="text-sm text-muted-foreground">초</span>
                        </>
                      ) : (
                        <>
                          <Select
                            value={editingValues.type || "running"}
                            onValueChange={(value: ExerciseType) => {
                              setEditingValues((prev) => ({
                                ...prev,
                                type: value,
                                intensity: "medium", // 운동 종류 변경 시 강도 초기화
                              }))
                            }}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="running">달리기</SelectItem>
                              <SelectItem value="walking">걷기</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={editingValues.intensity || "medium"}
                            onValueChange={(value: IntensityLevel) =>
                              setEditingValues((prev) => ({ ...prev, intensity: value }))
                            }
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {intensityOptions[editingValues.type || "running"].map((option) => (
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
                  ) : (
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
                      ) : isRest ? (
                        <>
                          <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${restColor}`}>
                            휴식
                          </div>
                          <span>/</span>
                          <span className="font-medium">{formatTime(item.duration)}</span>
                        </>
                      ) : (
                        <>
                          <div
                            className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${exerciseTypeColors[item.type]}`}
                          >
                            {exerciseTypeLabels[item.type]}
                          </div>
                          <span className="text-sm font-medium">
                            {getIntensityLabel(item.type, item.intensity || "medium")}
                          </span>
                          <span>/</span>
                          <span className="font-medium">{formatTime(item.duration)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && isSet && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      setCurrentParentId(item.id)
                      setIsAddDialogOpen(true)
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    추가
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-end gap-1">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-green-600" onClick={saveEdit}>
                      <Check className="w-4 h-4 mr-1" />
                      확인
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-red-600" onClick={cancelEdit}>
                      <X className="w-4 h-4 mr-1" />
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => moveItem(item.id, "up")}
                    >
                      <ChevronUp className="w-3 h-3 mr-1" />위
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => moveItem(item.id, "down")}
                    >
                      <ChevronDown className="w-3 h-3 mr-1" />
                      아래
                    </Button>
                    <div className="w-4"></div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      삭제
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {isSet && item.items.length > 0 && (
          <div className="mb-2">{item.items.map((subItem) => renderWorkoutItem(subItem, depth + 1, item.id))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
              <h1 className="text-xl font-semibold">새 타이머 만들기</h1>
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
                  onChange={(e) => setWorkout((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="workout-description">설명 (선택사항)</Label>
                <Input
                  id="workout-description"
                  placeholder="예: 고강도 인터벌 훈련"
                  value={workout.description}
                  onChange={(e) => setWorkout((prev) => ({ ...prev, description: e.target.value }))}
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
                      setWorkout((prev) => ({
                        ...prev,
                        warmupTime: Number.parseInt(e.target.value) * 60 || 0,
                      }))
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
                      setWorkout((prev) => ({
                        ...prev,
                        cooldownTime: Number.parseInt(e.target.value) * 60 || 0,
                      }))
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
            <DialogDescription>훈련, 세트 또는 휴식을 추가할 수 있습니다.</DialogDescription>
          </DialogHeader>

          <AddItemForm
            onAddExercise={(type, intensity, duration) => {
              addExercise(type, intensity, duration, currentParentId || undefined)
              setIsAddDialogOpen(false)
            }}
            onAddRest={(duration) => {
              addRest(duration, currentParentId || undefined)
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
  onAddRest,
  onAddSet,
  onCancel,
}: {
  onAddExercise: (type: ExerciseType, intensity: IntensityLevel, duration: number) => void
  onAddRest: (duration: number) => void
  onAddSet: (repetitions: number) => void
  onCancel: () => void
}) {
  const [itemType, setItemType] = useState<"exercise" | "set" | "rest">("exercise")
  const [exerciseType, setExerciseType] = useState<ExerciseType>("running")
  const [intensity, setIntensity] = useState<IntensityLevel>("medium")
  const [duration, setDuration] = useState(60)
  const [repetitions, setRepetitions] = useState(3)

  const handleSubmit = () => {
    if (itemType === "exercise") {
      onAddExercise(exerciseType, intensity, duration)
    } else if (itemType === "rest") {
      onAddRest(duration)
    } else {
      onAddSet(repetitions)
    }
  }

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: "1", minWidth: "160px" }}>
          <Label className="text-sm font-medium">추가할 항목</Label>
          <Select value={itemType} onValueChange={(value: "exercise" | "set" | "rest") => setItemType(value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exercise">훈련</SelectItem>
              <SelectItem value="set">세트</SelectItem>
              <SelectItem value="rest">휴식</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {itemType === "exercise" && (
          <div style={{ flex: "1", minWidth: "160px" }}>
            <Label className="text-sm font-medium">운동 종류</Label>
            <Select
              value={exerciseType}
              onValueChange={(value: ExerciseType) => {
                setExerciseType(value)
                setIntensity("medium")
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">달리기</SelectItem>
                <SelectItem value="walking">걷기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {itemType === "exercise" ? (
        <>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: "1", minWidth: "160px" }}>
              <Label className="text-sm font-medium">강도</Label>
              <Select value={intensity} onValueChange={(value: IntensityLevel) => setIntensity(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intensityOptions[exerciseType].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div style={{ flex: "1", minWidth: "160px" }}>
              <Label className="text-sm font-medium">시간 (초)</Label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(Number.parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>
        </>
      ) : itemType === "rest" ? (
        <div>
          <Label className="text-sm font-medium">시간 (초)</Label>
          <Input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(Number.parseInt(e.target.value) || 1)}
            className="mt-1"
          />
        </div>
      ) : (
        <div>
          <Label className="text-sm font-medium">반복횟수</Label>
          <Input
            type="number"
            min="1"
            value={repetitions}
            onChange={(e) => setRepetitions(Number.parseInt(e.target.value) || 1)}
            className="mt-1"
          />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary/90">
          추가
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          취소
        </Button>
      </div>
    </div>
  )
}
