"use client";

export default function ShowMoreButton({
  total,
  shownCount,
  nextStep,
  onMore,
}: {
  total: number;
  shownCount: number;
  nextStep: number;
  onMore: () => void;
}) {
  if (shownCount >= total) return null;
  return (
    <button type="button" onClick={onMore} className="btn-outline w-full">
      Ver {nextStep} registro{nextStep === 1 ? "" : "s"} más de {total}
    </button>
  );
}
