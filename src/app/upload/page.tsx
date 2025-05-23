import { FileUploadLocal } from "@/components/file-upload-components/file-upload-form-local";
import { FileUploadUploadThing } from "@/components/file-upload-components/file-upload-uploadthing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function IndexPage() {
  return (
    <section className={cn("grid items-center gap-8 pt-6 pb-8 md:py-8 container max-w-2xl")}>
      <Card>
        <CardHeader>
          <CardTitle>React hook form</CardTitle>
          <CardDescription>
            File upload integration with React Hook Form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadLocal />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>uploadthing</CardTitle>
          <CardDescription>File upload using uploadthing.</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadUploadThing />
        </CardContent>
      </Card>
    </section>
  );
}