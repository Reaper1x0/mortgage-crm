import Surface from "./Surface";

export default function FileList({
  title = "Selected files",
  files,
}: {
  title?: string;
  files: File[];
}) {
  if (!files?.length) return null;

  return (
    <Surface className="p-4" variant="card">
      <div className="text-sm font-bold text-text">
        {title} <span className="text-card-text">({files.length})</span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-card-text">
        {files.map((f) => (
          <li key={f.name} className="truncate">
            • <span className="text-text">{f.name}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
