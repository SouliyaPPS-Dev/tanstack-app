import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ListChecks, Pencil, Plus, Save, Trash2, X } from 'lucide-react'

export type InventoryItem = {
  id: number
  name: string
  category: string
  stock: number
  price: number
}

const seedInventory: InventoryItem[] = [
  { id: 1, name: 'Vintage Telecaster', category: 'Guitars', stock: 8, price: 1899 },
  { id: 2, name: 'Analog Chorus Pedal', category: 'Pedals', stock: 34, price: 179 },
  { id: 3, name: '50W Tube Amp', category: 'Amps', stock: 6, price: 1299 },
  { id: 4, name: 'Studio Headphones', category: 'Accessories', stock: 42, price: 249 },
]

export const Route = createFileRoute('/demo/crud')({
  component: CrudDemo,
})

function CrudDemo() {
  const [items, setItems] = useState<InventoryItem[]>(seedInventory)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formValues, setFormValues] = useState({
    name: '',
    category: '',
    stock: '0',
    price: '0',
  })

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) =>
      [item.name, item.category].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    )
  }, [items, search])

  const totalStock = useMemo(
    () => items.reduce((sum, item) => sum + item.stock, 0),
    [items],
  )
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.stock * item.price, 0),
    [items],
  )

  const resetForm = () => {
    setFormValues({ name: '', category: '', stock: '0', price: '0' })
    setEditingId(null)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setFormValues({
      name: item.name,
      category: item.category,
      stock: String(item.stock),
      price: String(item.price),
    })
  }

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    if (editingId === id) {
      resetForm()
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const stock = Number.parseInt(formValues.stock)
    const price = Number.parseFloat(formValues.price)

    if (!formValues.name.trim() || !formValues.category.trim()) {
      return
    }

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...formValues, stock, price }
            : item,
        ),
      )
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: prev.length ? Math.max(...prev.map((item) => item.id)) + 1 : 1,
          name: formValues.name,
          category: formValues.category,
          stock,
          price,
        },
      ])
    }

    resetForm()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-col gap-4">
          <span className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-orange-400">
            <ListChecks className="h-4 w-4" />
            CRUD Dashboard
          </span>
          <div>
            <h1 className="text-4xl font-black">Inventory Manager</h1>
            <p className="text-gray-400 mt-2">
              Add, search, update, and delete products in a single place. All
              interactions are instant and local, making it perfect for prototyping
              CRUD flows inside TanStack Start.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
            <p className="text-sm text-orange-300">Total products</p>
            <p className="text-3xl font-semibold">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <p className="text-sm text-cyan-300">Units in stock</p>
            <p className="text-3xl font-semibold">{totalStock}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">Inventory value</p>
            <p className="text-3xl font-semibold">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Products</h2>
                <p className="text-gray-400 text-sm">
                  Filter by name or category and manage inventory inline.
                </p>
              </div>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search inventory..."
                className="w-full md:w-64 rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400">
                    <th className="py-3 font-medium">Product</th>
                    <th className="py-3 font-medium">Category</th>
                    <th className="py-3 font-medium">Stock</th>
                    <th className="py-3 font-medium">Price</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 font-medium">{item.name}</td>
                      <td className="py-4 text-gray-300">{item.category}</td>
                      <td className="py-4">{item.stock}</td>
                      <td className="py-4">${item.price.toLocaleString()}</td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg border border-white/20 px-3 py-1 text-xs uppercase tracking-wider text-gray-200 hover:border-cyan-400 hover:text-cyan-300"
                          >
                            <Pencil className="mr-1 inline-block h-4 w-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg border border-white/20 px-3 py-1 text-xs uppercase tracking-wider text-red-300 hover:border-red-400 hover:text-red-200"
                          >
                            <Trash2 className="mr-1 inline-block h-4 w-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-gray-500" colSpan={5}>
                        No products match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-5">
            <div>
              <h2 className="text-2xl font-semibold">
                {editingId ? 'Update Product' : 'Add Product'}
              </h2>
              <p className="text-gray-400 text-sm">
                {editingId
                  ? 'Editing an existing item. Save changes or cancel to exit edit mode.'
                  : 'Create a new item to immediately add it to the inventory.'}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm text-gray-300" htmlFor="name">
                  Product name
                </label>
                <input
                  id="name"
                  value={formValues.name}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Deluxe Strat"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300" htmlFor="category">
                  Category
                </label>
                <input
                  id="category"
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. Pedals"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300" htmlFor="stock">
                    Stock
                  </label>
                  <input
                    id="stock"
                    type="number"
                    min="0"
                    value={formValues.stock}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        stock: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300" htmlFor="price">
                    Price ($)
                  </label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    value={formValues.price}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        price: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 font-semibold text-black transition hover:bg-orange-400"
                >
                  {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? 'Save Changes' : 'Create Item'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm text-gray-200 transition hover:border-white/40"
                    onClick={resetForm}
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
