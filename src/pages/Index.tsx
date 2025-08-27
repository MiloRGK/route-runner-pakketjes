
import { useState } from 'react';
import { MapPin, Upload, Route, Package, Clock, BarChart3, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RouteUpload from '@/components/RouteUpload';
import RouteOptimization from '@/components/RouteOptimization';
import RouteVisualization from '@/components/RouteVisualization';
import Statistics from '@/components/Statistics';
import History from '@/components/History';
import { EarningsDashboard } from '@/components/EarningsDashboard';

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
  bikeWalkRoute?: any; // BikeWalkRoute from multimodal types
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
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Route className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">RouteRunner</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate hidden sm:block">Optimale routes voor bezorgers</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 flex-shrink-0">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Nederland</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-6 sm:mb-8 animate-fade-in px-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              Welkom bij je route-assistent
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Upload je adressenlijst, laat ons de optimale route berekenen en loop efficiënt je wijk af. 
              Perfect voor folders, kranten en pakketbezorging te voet.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="p-3 sm:p-4">
                <MapPin className="w-6 sm:w-8 h-6 sm:h-8 text-primary mx-auto mb-2" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{addresses.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Adressen geladen</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3 sm:p-4">
                <Route className="w-6 sm:w-8 h-6 sm:h-8 text-primary mx-auto mb-2" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{routeSessions.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Routes gecreëerd</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3 sm:p-4">
                <Package className="w-6 sm:w-8 h-6 sm:h-8 text-primary mx-auto mb-2" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {addresses.filter(a => a.packageType === 1).length}/{addresses.filter(a => a.packageType === 2).length}
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Pakket 1 / Pakket 2</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-3 sm:p-4">
                <Clock className="w-6 sm:w-8 h-6 sm:h-8 text-primary mx-auto mb-2" />
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {routeSessions.reduce((acc, session) => acc + session.estimatedTime, 0)} min
                </div>
                <div className="text-xs sm:text-sm text-gray-600">Geschatte looptijd</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Interface */}
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="bg-gray-50">
                  <TabsList className="flex w-full bg-transparent p-0 border-b">
                    <TabsTrigger 
                      value="upload" 
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium py-3 sm:py-4 px-1 sm:px-2 rounded-none text-xs sm:text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Upload</span>
                      <span className="sm:hidden">📄</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="optimize"
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium py-3 sm:py-4 px-1 sm:px-2 rounded-none text-xs sm:text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                    >
                      <Route className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Optimaliseren</span>
                      <span className="sm:hidden">⚡</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="route"
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium py-3 sm:py-4 px-1 sm:px-2 rounded-none text-xs sm:text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                    >
                      <MapPin className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Route</span>
                      <span className="sm:hidden">🗺️</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="stats"
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium py-3 sm:py-4 px-1 sm:px-2 rounded-none text-xs sm:text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Statistieken</span>
                      <span className="sm:hidden">📊</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="history"
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium py-3 sm:py-4 px-1 sm:px-2 rounded-none text-xs sm:text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                    >
                      <Clock className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Historie</span>
                      <span className="sm:hidden">⏰</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="earnings"
                      className="flex-1 data-[state=active]:bg-white data-[state=active]:border-b data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium py-3 sm:py-4 px-1 sm:px-2 rounded-none text-xs sm:text-sm whitespace-nowrap hover:bg-gray-100 transition-colors"
                    >
                      <Euro className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="hidden sm:inline">Verdiensten</span>
                      <span className="sm:hidden">💰</span>
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

                <TabsContent value="earnings" className="p-6">
                  <EarningsDashboard />
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
