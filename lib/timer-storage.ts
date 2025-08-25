export type ExerciseType = "running" | "walking"
export type IntensityLevel = "low" | "medium" | "high"
export type ExerciseIntensity = IntensityLevel

export interface Exercise {
  id: string
  type: ExerciseType
  duration: number // seconds
  intensity?: IntensityLevel // 강도 추가
  name?: string
}

export interface Set {
  id: string
  type: "set"
  repetitions: number
  items: (Exercise | Set | Rest)[]
  name?: string
}

export interface Rest {
  id: string
  type: "rest"
  duration: number // seconds
  name?: string
}

export type WorkoutItem = Exercise | Set | Rest

export interface WorkoutPlan {
  id: string
  name: string
  description: string
  warmupTime: number // seconds
  cooldownTime: number // seconds
  items: WorkoutItem[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = "interval-timer-workouts"

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// Get all workouts from localStorage
export const getWorkouts = (): WorkoutPlan[] => {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Error loading workouts:", error)
    return []
  }
}

// Save workouts to localStorage
export const saveWorkouts = (workouts: WorkoutPlan[]): void => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
  } catch (error) {
    console.error("Error saving workouts:", error)
  }
}

// Get single workout by ID
export const getWorkout = (id: string): WorkoutPlan | null => {
  const workouts = getWorkouts()
  return workouts.find((w) => w.id === id) || null
}

// Create new workout
export const createWorkout = (workout: Omit<WorkoutPlan, "id" | "createdAt" | "updatedAt">): WorkoutPlan => {
  const newWorkout: WorkoutPlan = {
    ...workout,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const workouts = getWorkouts()
  workouts.push(newWorkout)
  saveWorkouts(workouts)

  return newWorkout
}

// Update existing workout
export function updateWorkout(workout: WorkoutPlan): WorkoutPlan | null
export function updateWorkout(id: string, updates: Partial<Omit<WorkoutPlan, "id" | "createdAt">>): WorkoutPlan | null
export function updateWorkout(
  idOrWorkout: string | WorkoutPlan,
  updates?: Partial<Omit<WorkoutPlan, "id" | "createdAt">>,
): WorkoutPlan | null {
  const workouts = getWorkouts()

  let id: string
  let updateData: Partial<Omit<WorkoutPlan, "id" | "createdAt">>

  if (typeof idOrWorkout === "string") {
    // 기존 방식: updateWorkout(id, updates)
    id = idOrWorkout
    updateData = updates || {}
  } else {
    // 새로운 방식: updateWorkout(workout)
    id = idOrWorkout.id
    updateData = {
      name: idOrWorkout.name,
      description: idOrWorkout.description,
      warmupTime: idOrWorkout.warmupTime,
      cooldownTime: idOrWorkout.cooldownTime,
      items: idOrWorkout.items,
    }
  }

  const index = workouts.findIndex((w) => w.id === id)
  if (index === -1) return null

  workouts[index] = {
    ...workouts[index],
    ...updateData,
    updatedAt: Date.now(),
  }

  saveWorkouts(workouts)
  return workouts[index]
}

// Delete workout
export const deleteWorkout = (id: string): boolean => {
  const workouts = getWorkouts()
  const filteredWorkouts = workouts.filter((w) => w.id !== id)

  if (filteredWorkouts.length === workouts.length) return false

  saveWorkouts(filteredWorkouts)
  return true
}

// Utility functions for workout calculations
export const flattenWorkout = (items: WorkoutItem[], repetitions = 1): (Exercise | Rest)[] => {
  const result: (Exercise | Rest)[] = []

  for (let rep = 0; rep < repetitions; rep++) {
    for (const item of items) {
      if (item.type === "set") {
        result.push(...flattenWorkout(item.items, item.repetitions))
      } else {
        result.push(item)
      }
    }
  }

  return result
}

export const calculateTotalTime = (workout: WorkoutPlan): number => {
  const flattenedWorkout = flattenWorkout(workout.items)
  const workoutTime = flattenedWorkout.reduce((sum, item) => sum + item.duration, 0)
  return workout.warmupTime + workoutTime + workout.cooldownTime
}

export const countIntervals = (workout: WorkoutPlan): number => {
  const flattenedWorkout = flattenWorkout(workout.items)
  let count = flattenedWorkout.length

  // Add warmup and cooldown if they exist
  if (workout.warmupTime > 0) count++
  if (workout.cooldownTime > 0) count++

  return count
}

// Initialize with sample data if no workouts exist
export const initializeSampleData = (): void => {
  const existing = getWorkouts()
  if (existing.length > 0) return

  const sampleWorkouts: Omit<WorkoutPlan, "id" | "createdAt" | "updatedAt">[] = [
    {
      name: "HIIT 러닝",
      description: "고강도 인터벌 훈련",
      warmupTime: 300,
      cooldownTime: 300,
      items: [
        {
          id: generateId(),
          type: "running",
          duration: 120,
        },
        {
          id: generateId(),
          type: "set",
          repetitions: 3,
          items: [
            {
              id: generateId(),
              type: "running",
              duration: 60,
            },
            {
              id: generateId(),
              type: "rest",
              duration: 30,
            },
          ],
        },
        {
          id: generateId(),
          type: "walking",
          duration: 180,
        },
      ],
    },
    {
      name: "초보자 러닝",
      description: "걷기와 조깅 반복",
      warmupTime: 180,
      cooldownTime: 180,
      items: [
        {
          id: generateId(),
          type: "set",
          repetitions: 6,
          items: [
            {
              id: generateId(),
              type: "walking",
              duration: 90,
            },
            {
              id: generateId(),
              type: "running",
              duration: 60,
            },
          ],
        },
      ],
    },
    {
      name: "스프린트 훈련",
      description: "단거리 전력질주 훈련",
      warmupTime: 600,
      cooldownTime: 600,
      items: [
        {
          id: generateId(),
          type: "set",
          repetitions: 5,
          items: [
            {
              id: generateId(),
              type: "running",
              duration: 30,
            },
            {
              id: generateId(),
              type: "rest",
              duration: 90,
            },
          ],
        },
        {
          id: generateId(),
          type: "walking",
          duration: 300,
        },
        {
          id: generateId(),
          type: "set",
          repetitions: 5,
          items: [
            {
              id: generateId(),
              type: "running",
              duration: 20,
            },
            {
              id: generateId(),
              type: "rest",
              duration: 60,
            },
          ],
        },
      ],
    },
  ]

  sampleWorkouts.forEach((workout) => createWorkout(workout))
}

// Utility functions for intensity calculations
export const getBaseIntensity = (type: ExerciseType): number => {
  switch (type) {
    case "walking":
      return 2
    case "running":
      return 3
    default:
      return 1
  }
}

export const getIntensityMultiplier = (intensity: IntensityLevel): number => {
  switch (intensity) {
    case "low":
      return 0.7
    case "medium":
      return 1.0
    case "high":
      return 1.3
    default:
      return 1.0
  }
}

export const calculateFinalIntensity = (type: ExerciseType, intensity: IntensityLevel = "medium"): number => {
  switch (type) {
    case "walking":
      switch (intensity) {
        case "low":
          return 1 // 천천히
        case "medium":
          return 2 // 보통
        case "high":
          return 3 // 빠르게
        default:
          return 2
      }
    case "running":
      switch (intensity) {
        case "low":
          return 3 // 조깅
        case "medium":
          return 4 // 보통
        case "high":
          return 5 // 전속력
        default:
          return 4
      }
    default:
      return 1
  }
}

export const getRestIntensity = (): number => {
  return 1 // 휴식은 항상 1
}

export const getIntensityLabel = (type: ExerciseType, intensity: IntensityLevel): string => {
  switch (type) {
    case "walking":
      return intensity === "low" ? "천천히" : intensity === "high" ? "빠르게" : "보통"
    case "running":
      return intensity === "low" ? "조깅" : intensity === "high" ? "전속력" : "보통"
    default:
      return "운동"
  }
}

export const getWarmupCooldownIntensity = (): number => {
  return 2 // 웜업과 쿨다운은 항상 강도 2
}
