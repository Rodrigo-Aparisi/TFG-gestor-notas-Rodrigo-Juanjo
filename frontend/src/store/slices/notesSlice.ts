import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Definir la interface para una nota
interface Note {
  id: string | number
  // Añade aquí las demás propiedades que tenga tu nota
  // Por ejemplo:
  title: string
  content: string
}

// Definir el estado inicial
interface NotesState {
  notes: Note[]
  loading: boolean
  error: null | string
}

const initialState: NotesState = {
  notes: [],
  loading: false,
  error: null
}

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    addNote: (state, action: PayloadAction<Note>) => {
      state.notes.push(action.payload)
    },
    deleteNote: (state, action: PayloadAction<string | number>) => {
      state.notes = state.notes.filter(note => note.id !== action.payload)
    },
    updateNote: (state, action: PayloadAction<Note>) => {
      const index = state.notes.findIndex(note => note.id === action.payload.id)
      if (index !== -1) {
        state.notes[index] = action.payload
      }
    }
  }
})

export const { addNote, deleteNote, updateNote } = notesSlice.actions
export default notesSlice.reducer
