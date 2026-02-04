import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ListChecks, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import {
  inventoryCollection,
  fetchInventory,
  type InventoryItem,
} from '@/db-collections/inventory';

const getInventory = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      search: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return fetchInventory({ search: data?.search });
  });

const saveInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.number().optional(),
      name: z.string(),
      category: z.string(),
      stock: z.number(),
      price: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.id) {
      // Update existing item
      inventoryCollection.update(data.id, (draft) => {
        draft.name = data.name;
        draft.category = data.category;
        draft.stock = data.stock;
        draft.price = data.price;
        draft.updated_at = new Date();
      });
      return { success: true, action: 'update' };
    } else {
      // Insert new item
      const now = new Date();
      inventoryCollection.insert({
        id: Date.now(),
        name: data.name,
        category: data.category,
        stock: data.stock,
        price: data.price,
        created_at: now,
        updated_at: now,
      });
      return { success: true, action: 'insert' };
    }
  });

const deleteInventoryItem = createServerFn({ method: 'POST' })
  .inputValidator(z.number())
  .handler(async ({ data }) => {
    inventoryCollection.delete(data);
    return { success: true };
  });

const searchSchema = z.object({
  q: z.string().optional(),
});

// routes/demo/crud.tsx
export const Route = createFileRoute('/demo/crud')({
  validateSearch: searchSchema,
  loader: async ({ location }) => {
    const searchParams = location.search as { q?: string };
    const searchTerm = searchParams.q ?? undefined;
    const items = await getInventory({
      data: {
        search: searchTerm,
      },
    });
    return {
      initialItems: items,
    };
  },
  component: CrudDemo,
});

function CrudDemo() {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState({
    name: '',
    category: '',
    stock: '0',
    price: '0',
  });
  const [isSaving, setIsSaving] = useState(false);

  const { initialItems } = Route.useLoaderData();
  const searchParams = Route.useSearch();

  const items = (initialItems ?? []) as InventoryItem[];
  const currentSearch = searchParams.q ?? '';

  const totalStock = useMemo(
    () => items.reduce((sum, item) => sum + item.stock, 0),
    [items],
  );
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.stock * item.price, 0),
    [items],
  );

  const resetForm = () => {
    setFormValues({ name: '', category: '', stock: '0', price: '0' });
    setEditingId(null);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormValues({
      name: item.name,
      category: item.category,
      stock: String(item.stock),
      price: String(item.price),
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteInventoryItem({ data: id });
      router.invalidate();
      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete inventory item', error);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const stock = Number.parseInt(formValues.stock);
    const price = Number.parseFloat(formValues.price);

    if (!formValues.name.trim() || !formValues.category.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveInventoryItem({
        data: {
          id: editingId ?? undefined,
          name: formValues.name.trim(),
          category: formValues.category.trim(),
          stock,
          price,
        },
      });
      router.invalidate();
      resetForm();
    } catch (error) {
      console.error('Failed to save inventory item', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-950 text-white px-6 py-10'>
      <div className='max-w-5xl mx-auto space-y-8'>
        <header className='flex flex-col gap-4'>
          <span className='inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-orange-400'>
            <ListChecks className='h-4 w-4' />
            CRUD Dashboard
          </span>
          <div>
            <h1 className='text-4xl font-black'>Inventory Manager</h1>
            <p className='text-gray-400 mt-2'>
              Add, search, update, and delete products in a single place. All
              interactions are instant and local, making it perfect for
              prototyping CRUD flows inside TanStack Start.
            </p>
          </div>
        </header>

        <section className='grid gap-4 md:grid-cols-3'>
          <div className='rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5'>
            <p className='text-sm text-orange-300'>Total products</p>
            <p className='text-3xl font-semibold'>{items.length}</p>
          </div>
          <div className='rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5'>
            <p className='text-sm text-cyan-300'>Units in stock</p>
            <p className='text-3xl font-semibold'>{totalStock}</p>
          </div>
          <div className='rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5'>
            <p className='text-sm text-emerald-300'>Inventory value</p>
            <p className='text-3xl font-semibold'>
              $
              {totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 0,
              })}
            </p>
          </div>
        </section>

        <section className='grid gap-8 lg:grid-cols-[1.1fr,0.9fr]'>
          <div className='rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-4'>
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
              <div>
                <h2 className='text-2xl font-semibold'>Products</h2>
                <p className='text-gray-400 text-sm'>
                  Filter by name or category and manage inventory inline.
                </p>
              </div>
              <input
                type='search'
                value={currentSearch}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  router.navigate({
                    to: '/demo/crud',
                    search: {
                      q: nextValue || undefined,
                    },
                    replace: true,
                  });
                }}
                placeholder='Search inventory...'
                className='w-full md:w-64 rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
              />
            </div>

            <div className='overflow-x-auto'>
              <table className='min-w-full text-left text-sm'>
                <thead>
                  <tr className='text-gray-400'>
                    <th className='py-3 font-medium'>Product</th>
                    <th className='py-3 font-medium'>Category</th>
                    <th className='py-3 font-medium'>Stock</th>
                    <th className='py-3 font-medium'>Price</th>
                    <th className='py-3 font-medium text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/5'>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className='py-4 font-medium'>{item.name}</td>
                      <td className='py-4 text-gray-300'>{item.category}</td>
                      <td className='py-4'>{item.stock}</td>
                      <td className='py-4'>${item.price.toLocaleString()}</td>
                      <td className='py-4'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => handleEdit(item)}
                            className='rounded-lg border border-white/20 px-3 py-1 text-xs uppercase tracking-wider text-gray-200 hover:border-cyan-400 hover:text-cyan-300'
                          >
                            <Pencil className='mr-1 inline-block h-4 w-4' />{' '}
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className='rounded-lg border border-white/20 px-3 py-1 text-xs uppercase tracking-wider text-red-300 hover:border-red-400 hover:text-red-200'
                          >
                            <Trash2 className='mr-1 inline-block h-4 w-4' />{' '}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        className='py-8 text-center text-gray-500'
                        colSpan={5}
                      >
                        No products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className='rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-5'>
            <div>
              <h2 className='text-2xl font-semibold'>
                {editingId ? 'Update Product' : 'Add Product'}
              </h2>
              <p className='text-gray-400 text-sm'>
                {editingId
                  ? 'Editing an existing item. Save changes or cancel to exit edit mode.'
                  : 'Create a new item to immediately add it to the inventory.'}
              </p>
            </div>

            <form className='space-y-4' onSubmit={handleSubmit}>
              <div>
                <label className='text-sm text-gray-300' htmlFor='name'>
                  Product name
                </label>
                <input
                  id='name'
                  value={formValues.name}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className='mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400'
                  placeholder='e.g. Deluxe Strat'
                />
              </div>

              <div>
                <label className='text-sm text-gray-300' htmlFor='category'>
                  Category
                </label>
                <input
                  id='category'
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                  className='mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400'
                  placeholder='e.g. Pedals'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm text-gray-300' htmlFor='stock'>
                    Stock
                  </label>
                  <input
                    id='stock'
                    type='number'
                    min='0'
                    value={formValues.stock}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        stock: event.target.value,
                      }))
                    }
                    className='mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400'
                  />
                </div>

                <div>
                  <label className='text-sm text-gray-300' htmlFor='price'>
                    Price ($)
                  </label>
                  <input
                    id='price'
                    type='number'
                    min='0'
                    value={formValues.price}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        price: event.target.value,
                      }))
                    }
                    className='mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400'
                  />
                </div>
              </div>

              <div className='flex items-center gap-3 pt-2'>
                <button
                  type='submit'
                  className='inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 font-semibold text-black transition hover:bg-orange-400 disabled:opacity-60'
                  disabled={isSaving}
                >
                  {editingId ? (
                    <Save className='h-4 w-4' />
                  ) : (
                    <Plus className='h-4 w-4' />
                  )}
                  {editingId ? 'Save Changes' : 'Create Item'}
                </button>
                {editingId && (
                  <button
                    type='button'
                    className='inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm text-gray-200 transition hover:border-white/40'
                    onClick={resetForm}
                  >
                    <X className='h-4 w-4' /> Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
