"use client";

import { useEffect } from "react";
import { BookProvider, useBook } from "@/context/BookContext";
import { Shelf } from "@/components/Shelf";
import { MainArea } from "@/components/MainArea";

export default function Home() {
  return (
    <BookProvider>
      <HomeContent />
    </BookProvider>
  );
}

function HomeContent() {
  const { state, actions } = useBook();

  // Check Gemini availability when the book becomes ready
  useEffect(() => {
    if (state.status === "ready") {
      actions.checkGeminiAvailability();
    }
  }, [state.status, actions.checkGeminiAvailability]);

  return (
    <div className="app-layout">
      <Shelf />
      <MainArea />
    </div>
  );
}
