"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import {
  PageHeader,
  SectionCard,
  Button,
  Badge,
} from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ShieldCheck,
  User,
} from "lucide-react";

// Form validation schema
const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["admin", "user"]),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch users
  const { data: users, isLoading } = trpc.user.list.useQuery();

  // Create user mutation
  const createMutation = trpc.user.create.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      closeModal();
    },
  });

  // Update user mutation
  const updateMutation = trpc.user.update.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      closeModal();
    },
  });

  // Delete user mutation
  const deleteMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setDeleteConfirmId(null);
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    reset({ name: "", email: "", password: "", role: "user" });
    setIsModalOpen(true);
  };

  const openEditModal = (user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  }) => {
    setEditingUser(user);
    reset({ name: user.name, email: user.email, password: "", role: user.role });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data: UserFormData) => {
    if (editingUser) {
      // Update existing user
      await updateMutation.mutateAsync({
        id: editingUser.id,
        name: data.name,
        email: data.email,
        role: data.role,
      });
    } else {
      // Create new user
      if (!data.password) {
        return; // Password required for new users
      }
      await createMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description="Create, edit, and manage user accounts"
      >
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </PageHeader>

      <div className="p-6">
        <SectionCard
          title="All Users"
          description="Manage user accounts and roles"
          icon={Users}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : users && users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {users.map((user) => (
                    <tr key={user.id} className="text-sm">
                      <td className="py-4 text-white">{user.name}</td>
                      <td className="py-4 text-slate-300">{user.email}</td>
                      <td className="py-4">
                        <Badge
                          variant={user.role === "admin" ? "default" : "outline"}
                          className="gap-1"
                        >
                          {user.role === "admin" ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-4 text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {deleteConfirmId === user.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(user.id)}
                                disabled={deleteMutation.isPending}
                                className="h-8 px-2 text-xs"
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(null)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(user.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              No users found. Click &quot;Add User&quot; to create one.
            </div>
          )}
        </SectionCard>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-slate-900 border border-slate-700 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter name"
                  className="bg-slate-800 border-slate-700"
                />
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter email"
                  className="bg-slate-800 border-slate-700"
                />
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser && "(leave blank to keep current)"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder={editingUser ? "••••••••" : "Enter password"}
                  className="bg-slate-800 border-slate-700"
                />
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  {...register("role")}
                  className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {errors.role && (
                  <p className="text-sm text-red-400">{errors.role.message}</p>
                )}
              </div>

              {(createMutation.error || updateMutation.error) && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-400">
                    {createMutation.error?.message || updateMutation.error?.message}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                >
                  {(isSubmitting || createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingUser ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

