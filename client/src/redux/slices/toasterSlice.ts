import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ToastProps } from "../../types/toaster.types";

interface ToasterState {
  toasts: ToastProps[];
}

const initialState: ToasterState = {
  toasts: [],
};

const toasterSlice = createSlice({
  name: "toaster",
  initialState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<ToastProps, "id">>) => {
      const id = Math.random().toString(36).substr(2, 9);
      state.toasts.push({ id, ...action.payload });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = toasterSlice.actions;
export default toasterSlice.reducer;
