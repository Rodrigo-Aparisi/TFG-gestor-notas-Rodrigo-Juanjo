import React, { useState, useCallback, useEffect } from "react";
import "../styles/groups.css";
import { useAuth } from "../hooks/useAuth";
import { useUserGroups } from "../hooks/useUserGroups";
import { GroupNote } from "../types";
import UserGroupSidebar from "../components/UserGroups/UserGroupSidebar";
import GroupNotesGrid from "../components/UserGroups/GroupNotesGrid"; // Corregida la importación
import GroupOfMembersList from "../components/UserGroups/GroupOfMembersList";
import CreateGroupModal from "../components/UserGroups/CreateGroupModal";
import AddMemberModal from "../components/UserGroups/AddMemberModal";
import CreateGroupNoteForm from "../components/UserGroups/CreateGroupNoteForm";
import GroupTabs from "../components/UserGroups/GroupTabs";
import { useTextareaResize } from "../hooks/useTextareaResize";
import api from "../services/api";
import config from "../config/config";

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { autoResizeTextarea } = useTextareaResize();
  const {
    userGroups = [],
    selectedGroup,
    groupNotes = [],
    loading,
    feedback,
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
    setUserNewGroup,
    setShowCreateGroupModal,
    setShowAddMemberModal,
    setNewNote,
    setEditingNote,
    showFeedback,
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
    try {
      const note = groupNotes.find((n) => n.id === noteId);
      if (!note) return;

      const updatedNote = {
        ...note,
        is_marked: !note.is_marked,
      };

      setEditingNote({ ...editingNote, [noteId]: updatedNote });

      // Aquí iría la llamada a la API para marcar/desmarcar la nota
      const response = await api.put(
        `/user-groups/notes/${noteId}/toggle-mark`
      );

      if (response.data.success) {
        // Actualizar la lista de notas
        const updatedNotes = groupNotes.map((n) =>
          n.id === noteId ? { ...n, is_marked: !n.is_marked } : n
        );
        // Aquí necesitarías una función para actualizar las notas en el estado
        // setGroupNotes(updatedNotes);
      }

      return true;
    } catch (error) {
      console.error("Error al marcar/desmarcar la nota:", error);
      return false;
    }
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
        showFeedback("Imagen subida correctamente");
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      showFeedback("Error al subir la imagen");
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

      // Añade un console.log para ver la respuesta completa
      console.log("Respuesta de subida de imagen:", response.data);

      if (response.data && response.data.data && response.data.data.imageUrl) {
        const imageUrl = response.data.data.imageUrl;
        console.log("URL de imagen recibida:", imageUrl);
        
        // Actualizar la nota con la nueva imagen
        const note = groupNotes.find((n) => n.id === noteId);
        if (note) {
          const updatedImages = [...(note.images || []), imageUrl];
          console.log("Imágenes actualizadas:", updatedImages);
          
          const updatedNote = {
            ...note,
            images: updatedImages,
          };

          // Actualizar el estado local
          setEditingNote({ ...editingNote, [noteId]: updatedNote });

          // Aquí es donde enviamos la actualización a la base de datos
          // Asegúrate de que esta función está enviando las imágenes correctamente
          const success = await updateGroupNote(noteId);
          console.log("Resultado de la actualización:", success);

          if (success) {
            showFeedback("Imagen subida y guardada correctamente");
          } else {
            showFeedback("La imagen se subió pero no se pudo guardar en la nota");
          }
        }
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      showFeedback("Error al subir la imagen");
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

      showFeedback("Imagen eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar la imagen:", error);
      showFeedback("Error al eliminar la imagen");
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
        showFeedback("No puedes editar tus propios permisos");
        return;
      }

      const response = await api.put(
        `/user-groups/${selectedGroup.id}/members/${memberToEdit.user_id}/role`,
        { role: newRole }
      );

      if (response.status === 200 || response.data.success) {
        // Actualizar el grupo seleccionado con el nuevo rol
        const updatedMembers = selectedGroup.members.map((member) =>
          member.id === memberId ? { ...member, role: newRole } : member
        );

        // Actualizar el grupo en useUserGroups
        const updatedGroup = { ...selectedGroup, members: updatedMembers };
        selectGroup(selectedGroup.id); // Recargar el grupo para obtener los datos actualizados

        showFeedback("Permisos actualizados correctamente");
      }
    } catch (error: any) {
      console.error("Error al actualizar permisos:", error);

      // Verificar si el error es específicamente por intentar editar los propios permisos
      if (
        error.response?.data?.message?.includes("own permissions") ||
        error.response?.data?.error?.includes("own permissions")
      ) {
        showFeedback("No puedes editar tus propios permisos");
      } else {
        showFeedback("Error al actualizar permisos");
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
      showFeedback("No tienes permisos para editar este grupo");
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
      showFeedback("No tienes permisos para editar este grupo");
    }
  };

  // Función para cambiar el nombre del grupo
  const handleRenameGroup = async () => {
    if (!selectedGroup) return;

    try {
      // Validar que el nuevo nombre no esté vacío
      if (!newGroupName || newGroupName.trim() === "") {
        showFeedback("El nombre del grupo no puede estar vacío");
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
        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);

        showFeedback("Nombre del grupo actualizado correctamente");
        setShowRenameModal(false);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("Error al cambiar el nombre del grupo:", error);

      if (error.response?.status === 403) {
        showFeedback("No tienes permisos para cambiar el nombre del grupo");
      } else {
        showFeedback("Error al cambiar el nombre del grupo");
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
        // Recargar el grupo para obtener los datos actualizados
        selectGroup(selectedGroup.id);

        showFeedback("Descripción del grupo actualizada correctamente");
        setShowDescriptionModal(false);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("Error al cambiar la descripción del grupo:", error);

      if (error.response?.status === 403) {
        showFeedback(
          "No tienes permisos para cambiar la descripción del grupo"
        );
      } else {
        showFeedback("Error al cambiar la descripción del grupo");
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
        {loading && <div className="loading-indicator">Cargando...</div>}
        {feedback && <div className="feedback-message">{feedback}</div>}

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
