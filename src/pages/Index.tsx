
import { useState } from 'react';
import { MapPin, Upload, Route, Package, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RouteUpload from '@/components/RouteUpload';
import RouteOptimization from '@/components/RouteOptimization';
import RouteVisualization from '@/components/RouteVisualization';
import Statistics from '@/components/Statistics';
import History from '@/components/History';

export interface Address {
  id: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  packageType: 1 | 2;
  coordinates?: [number, number];
  isCompleted?: boolean;
}

export interface RouteSession {
  id: string;
  name: string;
  addresses: Address[];
  optimizedOrder: number[];
  estimatedTime: number;
  estimatedDistance: number;
  createdAt: Date;
  completedAt?: Date;
}

const Index = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [routeSessions, setRouteSessions] = useState<RouteSession[]>([]);
  const [activeTab, setActiveTab] = useState('upload');

  const handleAddressesUploaded = (newAddresses: Address[]) => {
    setAddresses(newAddresses);
    setActiveTab('optimize');
  };

  const handleRouteOptimized = (session: RouteSession) => {
    setRouteSessions(prev => [...prev, session]);
    setActiveTab('route');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RouteRunner</h1>
                <p className="text-sm text-gray-600">Optimale routes voor bezorgers</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Nederland</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welkom bij je route-assistent
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload je adressenlijst, laat ons de optimale route berekenen en loop efficiënt je wijk af. 
              Perfect voor folders, kranten en pakketbezorging te voet.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="p-4">
                <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{addresses.length}</div>
                <div className="text-sm text-gray-600">Adressen geladen</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Route className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{routeSessions.length}</div>
                <div className="text-sm text-gray-600">Routes gecreëerd</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Package className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {addresses.filter(a => a.packageType === 1).length}/{addresses.filter(a => a.packageType === 2).length}
                </div>
                <div className="text-sm text-gray-600">Pakket 1 / Pakket 2</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {routeSessions.reduce((acc, session) => acc + session.estimatedTime, 0)} min
                </div>
                <div className="text-sm text-gray-600">Geschatte looptijd</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Interface */}
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b bg-gray-50">
                  <TabsList className="grid w-full grid-cols-5 bg-transparent p-0">
                    <TabsTrigger 
                      value="upload" 
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-4 px-6 rounded-none"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </TabsTrigger>
                    <TabsTrigger 
                      value="optimize"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-4 px-6 rounded-none"
                    >
                      <Route className="w-4 h-4 mr-2" />
                      Optimaliseren
                    </TabsTrigger>
                    <TabsTrigger 
                      value="route"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-4 px-6 rounded-none"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Route
                    </TabsTrigger>
                    <TabsTrigger 
                      value="stats"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-4 px-6 rounded-none"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Statistieken
                    </TabsTrigger>
                    <TabsTrigger 
                      value="history"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-4 px-6 rounded-none"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Historie
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="upload" className="p-6">
                  <RouteUpload onAddressesUploaded={handleAddressesUploaded} />
                </TabsContent>

                <TabsContent value="optimize" className="p-6">
                  <RouteOptimization 
                    addresses={addresses} 
                    onRouteOptimized={handleRouteOptimized}
                  />
                </TabsContent>

                <TabsContent value="route" className="p-6">
                  <RouteVisualization 
                    routeSessions={routeSessions}
                    addresses={addresses}
                  />
                </TabsContent>

                <TabsContent value="stats" className="p-6">
                  <Statistics routeSessions={routeSessions} addresses={addresses} />
                </TabsContent>

                <TabsContent value="history" className="p-6">
                  <History routeSessions={routeSessions} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
