"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Package, Plus, AlertTriangle, CheckCircle, Clock, ShoppingCart, Truck, BarChart3, Edit } from "lucide-react"

interface SupplyItem {
  id: number
  name: string
  category: "medical" | "equipment" | "consumables" | "safety"
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  cost: number
  supplier: string
  lastOrdered: string
  status: "in-stock" | "low-stock" | "out-of-stock" | "on-order"
}

interface ChecklistItem {
  id: number
  name: string
  category: string
  required: boolean
  checked: boolean
  quantity: number
  notes?: string
}

interface EventChecklist {
  id: number
  eventName: string
  date: string
  status: "pending" | "in-progress" | "completed"
  items: ChecklistItem[]
  completionPercentage: number
}

export function SupplyManagement() {
  const [supplies, setSupplies] = useState<SupplyItem[]>([
    {
      id: 1,
      name: "Blood Collection Bags",
      category: "medical",
      currentStock: 150,
      minStock: 100,
      maxStock: 500,
      unit: "units",
      cost: 2.5,
      supplier: "MedSupply Co.",
      lastOrdered: "Dec 1, 2024",
      status: "in-stock",
    },
    {
      id: 2,
      name: "Disposable Gloves",
      category: "safety",
      currentStock: 25,
      minStock: 50,
      maxStock: 200,
      unit: "boxes",
      cost: 15.0,
      supplier: "SafetyFirst Inc.",
      lastOrdered: "Nov 28, 2024",
      status: "low-stock",
    },
    {
      id: 3,
      name: "Blood Pressure Cuffs",
      category: "equipment",
      currentStock: 8,
      minStock: 6,
      maxStock: 15,
      unit: "units",
      cost: 45.0,
      supplier: "MedEquip Ltd.",
      lastOrdered: "Nov 15, 2024",
      status: "in-stock",
    },
    {
      id: 4,
      name: "Alcohol Swabs",
      category: "consumables",
      currentStock: 0,
      minStock: 20,
      maxStock: 100,
      unit: "boxes",
      cost: 8.0,
      supplier: "MedSupply Co.",
      lastOrdered: "Nov 20, 2024",
      status: "out-of-stock",
    },
    {
      id: 5,
      name: "Donor Beds",
      category: "equipment",
      currentStock: 12,
      minStock: 10,
      maxStock: 20,
      unit: "units",
      cost: 350.0,
      supplier: "MedFurniture Pro",
      lastOrdered: "Oct 15, 2024",
      status: "in-stock",
    },
  ])

  const [checklists, setChecklists] = useState<EventChecklist[]>([
    {
      id: 1,
      eventName: "Community Center Drive",
      date: "Dec 16, 2024",
      status: "in-progress",
      completionPercentage: 75,
      items: [
        { id: 1, name: "Blood Collection Bags", category: "Medical", required: true, checked: true, quantity: 50 },
        { id: 2, name: "Disposable Gloves", category: "Safety", required: true, checked: true, quantity: 10 },
        { id: 3, name: "Blood Pressure Cuffs", category: "Equipment", required: true, checked: true, quantity: 4 },
        { id: 4, name: "Donor Beds", category: "Equipment", required: true, checked: false, quantity: 6 },
        { id: 5, name: "Registration Forms", category: "Administrative", required: true, checked: true, quantity: 100 },
        { id: 6, name: "Snacks & Beverages", category: "Refreshments", required: false, checked: false, quantity: 50 },
        { id: 7, name: "First Aid Kit", category: "Safety", required: true, checked: true, quantity: 2 },
        { id: 8, name: "Signage", category: "Setup", required: true, checked: false, quantity: 5 },
      ],
    },
    {
      id: 2,
      eventName: "University Campus Drive",
      date: "Dec 18, 2024",
      status: "pending",
      completionPercentage: 0,
      items: [
        { id: 1, name: "Blood Collection Bags", category: "Medical", required: true, checked: false, quantity: 75 },
        { id: 2, name: "Disposable Gloves", category: "Safety", required: true, checked: false, quantity: 15 },
        { id: 3, name: "Blood Pressure Cuffs", category: "Equipment", required: true, checked: false, quantity: 6 },
        { id: 4, name: "Donor Beds", category: "Equipment", required: true, checked: false, quantity: 8 },
      ],
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-stock":
        return "bg-green-100 text-green-800"
      case "low-stock":
        return "bg-yellow-100 text-yellow-800"
      case "out-of-stock":
        return "bg-red-100 text-red-800"
      case "on-order":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in-stock":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "low-stock":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "out-of-stock":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "on-order":
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "medical":
        return "bg-red-100 text-red-800"
      case "equipment":
        return "bg-blue-100 text-blue-800"
      case "consumables":
        return "bg-green-100 text-green-800"
      case "safety":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const updateChecklistItem = (checklistId: number, itemId: number, checked: boolean) => {
    setChecklists((prev) =>
      prev.map((checklist) => {
        if (checklist.id === checklistId) {
          const updatedItems = checklist.items.map((item) => (item.id === itemId ? { ...item, checked } : item))
          const completionPercentage = Math.round(
            (updatedItems.filter((item) => item.checked).length / updatedItems.length) * 100,
          )
          return {
            ...checklist,
            items: updatedItems,
            completionPercentage,
            status: completionPercentage === 100 ? "completed" : "in-progress",
          }
        }
        return checklist
      }),
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="checklists">Event Checklists</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Supply Inventory</h3>
              <p className="text-sm text-muted-foreground">Track stock levels and manage supplies</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Truck className="h-4 w-4 mr-2" />
                Bulk Order
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Supply Item</DialogTitle>
                    <DialogDescription>Add a new item to the inventory</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="itemName">Item Name</Label>
                        <Input id="itemName" placeholder="Blood Collection Bags" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medical">Medical</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="consumables">Consumables</SelectItem>
                            <SelectItem value="safety">Safety</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentStock">Current Stock</Label>
                        <Input id="currentStock" type="number" placeholder="100" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minStock">Min Stock</Label>
                        <Input id="minStock" type="number" placeholder="50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxStock">Max Stock</Label>
                        <Input id="maxStock" type="number" placeholder="200" />
                      </div>
                    </div>
                    <Button className="w-full">Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplies.map((item) => (
              <Card key={item.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      <Badge className={getStatusColor(item.status)}>{item.status.replace("-", " ")}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stock Level</span>
                      <span className="font-medium">
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                    <Progress value={(item.currentStock / item.maxStock) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: {item.minStock}</span>
                      <span>Max: {item.maxStock}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-medium">${item.cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplier:</span>
                      <span className="font-medium">{item.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Ordered:</span>
                      <span className="font-medium">{item.lastOrdered}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" className="flex-1">
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Event Checklists</h3>
              <p className="text-sm text-muted-foreground">Manage supply requirements for each event</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Checklist
            </Button>
          </div>

          <div className="space-y-4">
            {checklists.map((checklist) => (
              <Card key={checklist.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{checklist.eventName}</CardTitle>
                      <CardDescription>{checklist.date}</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{checklist.completionPercentage}% Complete</p>
                        <Progress value={checklist.completionPercentage} className="w-24 h-2" />
                      </div>
                      <Badge
                        className={
                          checklist.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : checklist.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }
                      >
                        {checklist.status.replace("-", " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {checklist.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={(checked) =>
                              updateChecklistItem(checklist.id, item.id, checked as boolean)
                            }
                          />
                          <div>
                            <p className={`font-medium ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                              {item.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.category} • Qty: {item.quantity}
                              {item.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                          </div>
                        </div>
                        {item.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Purchase Orders</h3>
              <p className="text-sm text-muted-foreground">Track supply orders and deliveries</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #PO-2024-001</p>
                    <p className="text-sm text-muted-foreground">MedSupply Co. • Dec 10, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$450.00</p>
                    <Badge className="bg-green-100 text-green-800">Delivered</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #PO-2024-002</p>
                    <p className="text-sm text-muted-foreground">SafetyFirst Inc. • Dec 12, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$375.00</p>
                    <Badge className="bg-blue-100 text-blue-800">In Transit</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #PO-2024-003</p>
                    <p className="text-sm text-muted-foreground">MedSupply Co. • Dec 13, 2024</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$160.00</p>
                    <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Supply Reports</h3>
            <p className="text-sm text-muted-foreground">Analytics and insights on supply usage</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold text-primary">{supplies.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {supplies.filter((s) => s.status === "low-stock").length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">
                      {supplies.filter((s) => s.status === "out-of-stock").length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold text-green-600">$2,340</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Levels by Category</CardTitle>
                <CardDescription>Current inventory status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["medical", "equipment", "consumables", "safety"].map((category) => {
                    const categoryItems = supplies.filter((s) => s.category === category)
                    const totalValue = categoryItems.reduce((sum, item) => sum + item.currentStock * item.cost, 0)
                    return (
                      <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium capitalize">{category}</p>
                          <p className="text-sm text-muted-foreground">{categoryItems.length} items</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${totalValue.toFixed(2)}</p>
                          <Badge className={getCategoryColor(category)}>{category}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest supply movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border-l-4 border-l-green-500 bg-card">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Blood Collection Bags restocked</p>
                      <p className="text-sm text-muted-foreground">+100 units • 2 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border-l-4 border-l-yellow-500 bg-card">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1">
                      <p className="font-medium">Disposable Gloves running low</p>
                      <p className="text-sm text-muted-foreground">25 boxes remaining • 4 hours ago</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 border-l-4 border-l-red-500 bg-card">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div className="flex-1">
                      <p className="font-medium">Alcohol Swabs out of stock</p>
                      <p className="text-sm text-muted-foreground">Order placed • 6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
