import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Database, Plus, Hash } from "lucide-react";
import { useEffect, useState } from "react";

type DigitalRecord = {
  certificateNumber: string;
  hashHex: string;
  name: string;
  institution: string;
  course: string;
  year: number;
  notes?: string;
};

export default function Admin() {
  const [files, setFiles] = useState<File[]>([]);
  const [records, setRecords] = useState<DigitalRecord[]>(() => {
    const raw = localStorage.getItem("admin:records");
    return raw ? (JSON.parse(raw) as DigitalRecord[]) : [];
  });

  useEffect(() => {
    localStorage.setItem("admin:records", JSON.stringify(records));
  }, [records]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles((prev) => [...prev, ...list]);
  };

  const onAddRecord = (r: DigitalRecord) => {
    setRecords((prev) => [r, ...prev]);
  };

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin panel</h1>
          <p className="text-muted-foreground">
            Upload sample documents and register digital validation data used by
            the verification engine.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" /> Upload sample documents
              </CardTitle>
              <CardDescription>
                PDFs or images used to improve OCR/AI recognition and regression
                tests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border-2 border-dashed p-6 text-center">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  onChange={onFileChange}
                  className="block w-full text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  You can add multiple files.
                </p>
              </div>
              {files.length > 0 && (
                <ul className="mt-4 grid gap-2 text-sm">
                  {files.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <span className="truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(f.size / 1024)} KB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" /> Register digital data
              </CardTitle>
              <CardDescription>
                Add cryptographic hashes, certificate numbers, and metadata for
                cross-verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecordForm onSubmit={onAddRecord} />
            </CardContent>
          </Card>
        </div>

        {records.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" /> Registry entries
              </CardTitle>
              <CardDescription>
                Recently added records. Persisted locally for demo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {records.map((r, idx) => (
                  <div key={idx} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-muted-foreground">
                      {r.institution} • {r.course} • {r.year}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium">No:</span>{" "}
                      {r.certificateNumber}
                    </div>
                    <div className="mt-1 break-all">
                      <span className="font-medium">Hash:</span> {r.hashHex}
                    </div>
                    {r.notes && (
                      <div className="mt-1 text-muted-foreground">
                        {r.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function RecordForm({ onSubmit }: { onSubmit: (r: DigitalRecord) => void }) {
  const [form, setForm] = useState<DigitalRecord>({
    certificateNumber: "",
    hashHex: "",
    name: "",
    institution: "",
    course: "",
    year: new Date().getFullYear(),
    notes: "",
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
        setForm({
          certificateNumber: "",
          hashHex: "",
          name: "",
          institution: "",
          course: "",
          year: new Date().getFullYear(),
          notes: "",
        });
      }}
    >
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cn">Certificate number</Label>
          <Input
            id="cn"
            value={form.certificateNumber}
            onChange={(e) =>
              setForm({ ...form, certificateNumber: e.target.value })
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="hash">Document SHA-256 hash</Label>
          <Input
            id="hash"
            value={form.hashHex}
            onChange={(e) => setForm({ ...form, hashHex: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="name">Student name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="inst">Institution</Label>
          <Input
            id="inst"
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="course">Course</Label>
          <Input
            id="course"
            value={form.course}
            onChange={(e) => setForm({ ...form, course: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" className="gap-2">
          <Plus className="h-4 w-4" /> Add record
        </Button>
      </div>
    </form>
  );
}
