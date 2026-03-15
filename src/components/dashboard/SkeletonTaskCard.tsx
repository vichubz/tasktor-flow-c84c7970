const SkeletonTaskCard = () => {
  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
      <div className="w-4 h-4 rounded bg-muted" />
      <div className="w-7 h-5 rounded-md shimmer" />
      <div className="w-6 h-6 rounded-full shimmer" />
      <div className="flex-1 h-4 rounded shimmer" />
      <div className="w-16 h-4 rounded shimmer" />
      <div className="w-12 h-4 rounded shimmer" />
    </div>
  );
};

export default SkeletonTaskCard;
