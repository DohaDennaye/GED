import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, FileSpreadsheet, FileImage, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatFileSize } from "@/lib/file-utils";
import axios from "axios";
type Folder = {
  id: number;
  name: string;
  path: string;
};
export function useFolders() {
  return useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: async () => {
      const { data } = await axios.get("/api/folders");
      return data;
    },
  });
}
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedFolderId: number | null;
}

interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
}

export default function UploadModal({ isOpen, onClose, onSuccess, selectedFolderId }: UploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>(selectedFolderId?.toString() || "");
  const [tags, setTags] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();


  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
    queryFn: async () => {
      const response = await apiRequest("/api/folders");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des dossiers");
      }
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { files: FileWithPreview[]; folderId: number; tags: string }) => {
      const formData = new FormData();
      data.files.forEach((fileWithId) => {
        formData.append("files", fileWithId.file);
      });
      formData.append("folderId", data.folderId.toString());
      formData.append("tags", data.tags);

      const response = await apiRequest("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload réussi",
        description: `${files.length} fichier(s) uploadé(s) avec succès.`,
      });
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader les fichiers.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFiles([]);
    setSelectedFolder(selectedFolderId?.toString() || "");
    setTags("");
    setUploadProgress(0);
    setIsDragOver(false);
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const filesWithId = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
    }));
    setFiles((prev) => [...prev, ...filesWithId]);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleUpload = async () => {
    const formData = new FormData();
    files.forEach(fileWithPreview => {
      formData.append("files", fileWithPreview.file);
    });

    formData.append("folderId", selectedFolderId?.toString() || "");
    formData.append("tags", JSON.stringify(tags));

    await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
    console.log("Sending upload", {
      selectedFolder,
      folderId: selectedFolderId,
      tags,
    });
    if (!selectedFolder) {
      toast({
        title: "Dossier requis",
        description: "Veuillez sélectionner un dossier de destination.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      files,
      folderId: parseInt(selectedFolder),
      tags,
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type && file.type.startsWith("image/")) {
      return <FileImage className="h-5 w-5 text-purple-500" />;
    }

    const extension = file.name?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case "docx":
      case "doc":
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter des documents</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
              ? "border-primary bg-primary/10"
              : "border-gray-300 hover:border-gray-400"
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Glissez-déposez vos fichiers ici ou
            </p>
            <Button variant="outline" onClick={() => document.getElementById("file-input")?.click()}>
              Parcourir les fichiers
            </Button>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <Label>Fichiers sélectionnés ({files.length})</Label>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.file)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.file.name || 'Fichier sans nom'}</p>
                      <p className="text-xs text-gray-500">{file.file.size ? formatFileSize(file.file.size) : 'Taille inconnue'}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Label>Upload en cours...</Label>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Folder Selection */}
            <div className="space-y-2">
              <Label htmlFor="folder">Dossier de destination *</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un dossier" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (optionnel)</Label>
              <Input
                id="tags"
                placeholder="Séparez les tags par des virgules"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          {/* Tag Preview */}
          {tags && (
            <div className="space-y-2">
              <Label>Aperçu des tags</Label>
              <div className="flex flex-wrap gap-1">
                {tags.split(",").map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || !selectedFolder || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Upload..." : `Télécharger (${files.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
