import Link from "next/link";
import NewGroupForm from "./NewGroupForm";

export default function NewGroupPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted hover:text-pitch">
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          Crear grupo
        </h1>
        <p className="text-sm text-muted">
          Crea un grupo e invita a tus amigos por correo Gmail.
        </p>
      </div>
      <NewGroupForm />
    </div>
  );
}
