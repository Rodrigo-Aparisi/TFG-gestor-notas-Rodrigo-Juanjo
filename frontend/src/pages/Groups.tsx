import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/groups.css";
import { useAuth } from "../hooks/useAuth";
import { useUserGroups } from "../hooks/useUserGroups";
import { GroupNote, ApiErrorResponse } from "../types";
import UserGroupSidebar from "../components/UserGroups/UserGroupSidebar";
import GroupNotesGrid from "../components/UserGroups/GroupNotesGrid";
import GroupOfMembersList from "../components/UserGroups/GroupOfMembersList";
import CreateGroupModal from "../components/UserGroups/CreateGroupModal";
import AddMemberModal from "../components/UserGroups/AddMemberModal";
import CreateGroupNoteForm from "../components/UserGroups/CreateGroupNoteForm";
import GroupTabs from "../components/UserGroups/GroupTabs";
import { useTextareaResize } from "../hooks/useTextareaResize";
import api from "../services/api";

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { autoResizeTextarea } = useTextareaResize();
  const {
    userGroups = [],
    selectedGroup,
    groupNotes = [],
    loading,
    newUserGroup,
    showCreateGroupModal,
    showAddMemberModal,
    newNote,
    editingNote,
    createGroup,
    addGroupMember,
    removeGroupMember,
    createGroupNote,
    updateGroupNote,
    handleNoteChange,
    deleteGroupNote,
    selectGroup,
    togglePinGroupNote,
    toggleMarkGroupNote,
    setUserNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote,
  } = useUserGroups();

  const [activeTab, setActiveTab] = useState<"notes" | "members">("notes");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);

  // Estados para los modales y campos de edición
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  // Determinar si el usuario actual es propietario o administrador del grupo seleccionado
  const isOwnerOrAdmin = React.useMemo(() => {
    if (!selectedGroup?.members || !user?.id) {
      return false;
    }

    // Buscar directamente al usuario en los miembros del grupo
    const userMember = selectedGroup.members.find(
      (member) => member.user_id === user.id
    );

    if (userMember) {
      // El usuario es propietario o admin
      if (userMember.role === "owner" || userMember.role === "admin") {
        return true;
      }
    }

    return false;
  }, [selectedGroup?.members, user?.id, forceRender]);

  // Forzar re-renderizado cuando cambia el grupo seleccionado
  useEffect(() => {
    setForceRender((prev) => prev + 1);
    if (selectedGroup) {
      setNewGroupName(selectedGroup.name);
      setNewGroupDescription(selectedGroup.description || "");
    }
  }, [selectedGroup]);

  const handleEditNote = (note: GroupNote) => {
    setEditingNoteId(note.id);
    setFocusedNoteId(note.id);
    setEditingNote({ [note.id]: note });
  };

  const handleUpdateNoteSubmit = async () => {
    if (!editingNoteId) return;
    const success = await updateGroupNote(editingNoteId);
    if (success) {
      setEditingNoteId(null);
      setFocusedNoteId(null);
    }
  };

  const handleAddMember = async (username: string) => {
    if (!selectedGroup) return;
    const success = await addGroupMember({
      groupId: selectedGroup.id,
      username,
    });
    if (success) {
      setShowAddMemberModal(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;
    if (
      window.confirm(
        "¿Estás seguro de que deseas eliminar a este miembro del grupo?"
      )
    ) {
      await removeGroupMember(selectedGroup.id, userId);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta nota?")) {
      await deleteGroupNote(noteId);
    }
  };

  const handleTogglePinNote = async (
    noteId: string,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }
    if (selectedGroup) {
      await togglePinGroupNote(selectedGroup.id, noteId);
    }
  };

  const handleToggleMarkNote = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (!selectedGroup) return;
    await toggleMarkGroupNote(selectedGroup.id, noteId);
  };

  const handleGroupImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!selectedGroup) return; // Asegúrate de que hay un grupo seleccionado

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await api.post(
        `/user-groups/${selectedGroup.id}/notes/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.data && response.data.data.imageUrl) {
        setNewNote((prev) => ({
          ...prev,
          images: [...(prev.images || []), response.data.data.imageUrl],
        }));
        toast.success("Imagen subida correctamente");
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      toast.error("Error al subir la imagen");
    }
  };

  const handleNoteImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, noteId: string) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedGroup) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("image", file);

    try {
      // Usa la ruta con el ID del grupo
      const response = await api.post(
        `/user-groups/${selectedGroup.id}/notes/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.data && response.data.data.imageUrl) {
        const imageUrl = response.data.data.imageUrl;

        const note = groupNotes.find((n) => n.id === noteId);
        if (note) {
          const updatedImages = [...(note.images || []), imageUrl];
          const updatedNote = {
            ...note,
            images: updatedImages,
          };

          setEditingNote({ ...editingNote, [noteId]: updatedNote });

          const success = await updateGroupNote(noteId);

          if (success) {
            toast.success("Imagen subida y guardada correctamente");
          } else {
            toast.error("La imagen se subió pero no se pudo guardar en la nota");
          }
        }
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      toast.error("Error al subir la imagen");
    }
  };

  const handleDeleteNoteImage = async (noteId: string, imageIndex: number) => {
    try {
      const note = groupNotes.find((n) => n.id === noteId);
      if (!note || !note.images || note.images.length <= imageIndex) return;

      const updatedImages = [...note.images];
      updatedImages.splice(imageIndex, 1);

      const updatedNote = {
        ...note,
        images: updatedImages,
      };

      setEditingNote({ ...editingNote, [noteId]: updatedNote });

      // Llamar a la API para eliminar la imagen
      await api.delete(`/user-groups/notes/${noteId}/images/${imageIndex}`);

      // Actualizar la nota
      await updateGroupNote(noteId);

      toast.success("Imagen eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar la imagen:", error);
      toast.error("Error al eliminar la imagen");
    }
  };

  const handleEditPermissions = async (memberId: string, newRole: string) => {
    if (!selectedGroup) return;

    try {
      // Obtener el user_id del miembro que se está editando
      const memberToEdit = selectedGroup.members.find((m) => m.id === memberId);
      if (!memberToEdit) return;

      // Verificar si el usuario está intentando editar sus propios permisos
      if (memberToEdit.user_id === user?.id) {
        toast.error("No puedes editar tus propios permisos");
        return;
      }

      const response = await api.put(
        `/user-groups/${selectedGroup.id}/members/${memberToEdit.user_id}/role`,
        { role: newRole }
      );

      if (response.status === 200 || response.data.success) {
        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);

        toast.success("Permisos actualizados correctamente");
      }
    } catch (error: unknown) {
      console.error("Error al actualizar permisos:", error);
      const apiError = error as ApiErrorResponse;

      // Verificar si el error es específicamente por intentar editar los propios permisos
      if (
        apiError.response?.data?.message?.includes("own permissions") ||
        apiError.response?.data?.error?.includes("own permissions")
      ) {
        toast.error("No puedes editar tus propios permisos");
      } else {
        toast.error("Error al actualizar permisos");
      }
    }
  };

  // Función para manejar la edición del nombre del grupo
  const handleEditGroupName = (groupId: string) => {
    if (!selectedGroup) return;

    // Verificar si el usuario tiene permisos
    if (isOwnerOrAdmin) {
      setNewGroupName(selectedGroup.name);
      setShowRenameModal(true);
    } else {
      toast.error("No tienes permisos para editar este grupo");
    }
  };

  // Función para manejar la edición de la descripción del grupo
  const handleEditGroupDescription = (groupId: string) => {
    if (!selectedGroup) return;

    // Verificar si el usuario tiene permisos
    if (isOwnerOrAdmin) {
      setNewGroupDescription(selectedGroup.description || "");
      setShowDescriptionModal(true);
    } else {
      toast.error("No tienes permisos para editar este grupo");
    }
  };

  // Función para cambiar el nombre del grupo
  const handleRenameGroup = async () => {
    if (!selectedGroup) return;

    try {
      // Validar que el nuevo nombre no esté vacío
      if (!newGroupName || newGroupName.trim() === "") {
        toast.error("El nombre del grupo no puede estar vacío");
        return false;
      }

      // Llamada a la API para actualizar el nombre del grupo
      const response = await api.put(
        `/user-groups/${selectedGroup.id}/rename`,
        {
          name: newGroupName,
        }
      );

      if (response.status === 200 || response.data.success) {
        // Actualizar la lista de grupos localmente
        // Forzar la actualización del componente
        setForceRender(prev => prev + 1);

        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);

        toast.success("Nombre del grupo actualizado correctamente");
        setShowRenameModal(false);
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error("Error al cambiar el nombre del grupo:", error);
      const apiError = error as ApiErrorResponse;

      if (apiError.response?.status === 403) {
        toast.error("No tienes permisos para cambiar el nombre del grupo");
      } else {
        toast.error("Error al cambiar el nombre del grupo");
      }

      return false;
    }
  };

  // Función para cambiar la descripción del grupo
  const handleUpdateGroupDescription = async () => {
    if (!selectedGroup) return;

    try {
      // Llamada a la API para actualizar la descripción del grupo
      const response = await api.put(
        `/user-groups/${selectedGroup.id}/description`,
        {
          description: newGroupDescription,
        }
      );

      if (response.status === 200 || response.data.success) {
        // Forzar la actualización del componente
        setForceRender(prev => prev + 1);

        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);

        toast.success("Descripción del grupo actualizada correctamente");
        setShowDescriptionModal(false);
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error("Error al cambiar la descripción del grupo:", error);
      const apiError = error as ApiErrorResponse;

      if (apiError.response?.status === 403) {
        toast.error("No tienes permisos para cambiar la descripción del grupo");
      } else {
        toast.error("Error al cambiar la descripción del grupo");
      }

      return false;
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    noteId: string
  ) => {
    // Implementar funcionalidades como atajos de teclado
    // Por ejemplo: Ctrl+S para guardar
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      updateGroupNote(noteId);
    }
  };

  const insertList = (noteId: string, type: "bullet" | "number") => {
    const note = editingNote[noteId];
    if (!note) return;

    const textarea = document.querySelector(
      `textarea[data-note-id="${noteId}"]`
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = note.content || "";
    const prefix = type === "bullet" ? "• " : "1. ";

    const newContent =
      content.substring(0, start) +
      prefix +
      content.substring(start, end) +
      "\n" +
      content.substring(end);

    handleNoteChange(noteId, "content", newContent);

    // Reposicionar el cursor después de la inserción
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    }, 0);
  };

  const handleExportNote = (format: string, noteId?: string) => {
    if (!noteId) return;

    const note = groupNotes.find((n) => n.id === noteId);
    if (!note) return;

    let content = "";
    let filename = "";
    let mimeType = "";

    switch (format) {
      case "txt":
        content = `${note.title || "Sin título"}\n\n${note.content || ""}`;
        filename = `${note.title || "nota"}.txt`;
        mimeType = "text/plain";
        break;
      case "html":
        content = `<html><head><title>${
          note.title || "Sin título"
        }</title></head><body><h1>${note.title || "Sin título"}</h1><div>${(
          note.content || ""
        ).replace(/\n/g, "<br>")}</div></body></html>`;
        filename = `${note.title || "nota"}.html`;
        mimeType = "text/html";
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFocusNote = (
    id: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.stopPropagation();
    setFocusedNoteId(id);
    setEditingNoteId(id);

    // Si la nota no está en el estado de edición, añadirla
    if (!editingNote[id]) {
      const noteToEdit = groupNotes.find((note) => note.id === id);
      if (noteToEdit) {
        setEditingNote({ ...editingNote, [id]: noteToEdit });
      }
    }
  };

  const handleFocusIndicatorClick = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();

    // Guardar cambios si hay una nota en edición
    if (editingNoteId === id) {
      handleUpdateNoteSubmit();
    }

    setFocusedNoteId(null);
    setEditingNoteId(null);
  };

  return (
    <div className="groups-layout">
      <UserGroupSidebar
        groups={userGroups || []}
        activeGroup={selectedGroup?.id || ""}
        onGroupSelect={selectGroup}
        onEditGroupName={handleEditGroupName}
        onEditGroupDescription={handleEditGroupDescription}
      />

      <div className="overlay"></div>

      <div className="groups-main">
        {/* Zona de feedback accesible para lectores de pantalla */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {loading ? 'Cargando grupos...' : ''}
        </div>
        {loading && <div className="loading-indicator">Cargando...</div>}

        {selectedGroup ? (
          <>
            <div className="group-header">
              <div>
                <h1>{selectedGroup.name}</h1>
                {selectedGroup.description && (
                  <p>{selectedGroup.description}</p>
                )}
              </div>

              <div className="group-actions" style={{ display: "flex" }}>
                <button
                  className="add-member-btn"
                  onClick={() => setShowAddMemberModal(true)}
                  style={{ display: "block" }}
                >
                  + Añadir Miembro
                </button>
              </div>
            </div>

            <GroupTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "notes" ? (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <CreateGroupNoteForm
                    newNote={newNote}
                    isLoading={loading}
                    setNewNote={setNewNote}
                    handleCreateNote={createGroupNote}
                    handleImageUpload={handleGroupImageUpload}
                    autoResizeTextarea={autoResizeTextarea}
                  />
                </div>

                <GroupNotesGrid
                  notes={groupNotes || []}
                  currentUserId={user?.id || ""}
                  isOwnerOrAdmin={isOwnerOrAdmin}
                  editingNote={editingNote}
                  focusedNoteId={focusedNoteId}
                  onEditNote={handleEditNote}
                  onDeleteNote={handleDeleteNote}
                  handleTogglePin={handleTogglePinNote}
                  handleToggleMark={handleToggleMarkNote}
                  handleNoteChange={handleNoteChange}
                  updateGroupNote={updateGroupNote}
                  handleFocus={handleFocusNote}
                  handleFocusIndicatorClick={handleFocusIndicatorClick}
                  handleKeyDown={handleKeyDown}
                  insertList={insertList}
                  autoResizeTextarea={autoResizeTextarea}
                  handleImageUpload={handleNoteImageUpload}
                  handleDeleteImage={handleDeleteNoteImage}
                  handleExportNote={handleExportNote}
                />
              </>
            ) : (
              <GroupOfMembersList
                members={selectedGroup.members || []}
                currentUserId={user?.id || ""}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onRemoveMember={handleRemoveMember}
                onEditPermissions={handleEditPermissions}
              />
            )}
          </>
        ) : (
          <div className="no-group-selected">
            <h2>Selecciona un grupo o crea uno nuevo</h2>
            <button
              className="create-group-btn large"
              onClick={() => setShowCreateGroupModal(true)}
            >
              + Crear Nuevo Grupo
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      {showCreateGroupModal && (
        <CreateGroupModal
          newUserGroup={newUserGroup}
          setUserNewGroup={setUserNewGroup}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={createGroup}
        />
      )}
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          onAddMember={handleAddMember}
        />
      )}

      {/* Modal para editar el grupo (nombre y descripción) */}
      {(showRenameModal || showDescriptionModal) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar grupo</h2>
            <div className="form-group">
              <label htmlFor="group-name-edit">Nombre del grupo</label>
              <input
                id="group-name-edit"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Nombre del grupo"
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="group-description-edit">
                Descripción (opcional)
              </label>
              <textarea
                id="group-description-edit"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Descripción del grupo"
                className="form-control"
                rows={4}
              />
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowRenameModal(false);
                  setShowDescriptionModal(false);
                }}
              >
                Cancelar
              </button>
              <button
                className="confirm-btn"
                onClick={() => {
                  handleRenameGroup();
                  handleUpdateGroupDescription();
                  setShowRenameModal(false);
                  setShowDescriptionModal(false);
                }}
                disabled={!newGroupName.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
