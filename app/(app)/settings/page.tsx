import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input defaultValue="Demo User" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue="demo@vellopad.com" type="email" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Default Shipping Address</CardTitle>
              <CardDescription>Used for proof copies and orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Street Address</label>
                  <Input placeholder="123 Main St" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input placeholder="San Francisco" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State/Province</label>
                  <Input placeholder="CA" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Postal Code</label>
                  <Input placeholder="94102" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input placeholder="United States" />
                </div>
              </div>
              <Button>Save Address</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Plan</CardTitle>
              <CardDescription>You are on the Free plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="font-medium">Free</div>
                  <div className="text-sm text-muted-foreground">
                    Up to 3 books, basic features
                  </div>
                </div>
                <Button variant="outline">Current Plan</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="font-medium">Pro — $9/month</div>
                  <div className="text-sm text-muted-foreground">
                    Unlimited books, priority support, AI tools
                  </div>
                </div>
                <Button>Upgrade</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Method</CardTitle>
              <CardDescription>Add a card for printing orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Add Payment Method</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Email Notifications</CardTitle>
              <CardDescription>Choose what emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Order updates", desc: "Shipping and delivery notifications", enabled: true },
                { label: "Writing reminders", desc: "Daily nudges to keep your streak", enabled: true },
                { label: "Marketing tips", desc: "Weekly tips to promote your book", enabled: false },
                { label: "Product updates", desc: "New features and announcements", enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full p-1 transition cursor-pointer ${
                      item.enabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition ${
                        item.enabled ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
