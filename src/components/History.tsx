
import { useState } from 'react';
import { Clock, MapPin, Package, Calendar, Trash2, Eye, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';

interface HistoryProps {
  routeSessions: RouteSession[];
}

const History = ({ routeSessions }: HistoryProps) => {
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}u ${mins}m`;
    }
    return `${mins}m`;
  };

  const deleteSession = (sessionId: string) => {
    // In a real app, this would update the parent state
    toast({
      title: "Sessie verwijderd",
      description: "De route sessie is verwijderd uit de geschiedenis.",
    });
  };

  if (routeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Geen geschiedenis beschikbaar</h3>
        <p className="text-gray-500">
          Hier verschijnen je voltooide routes en sessies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Route geschiedenis</h3>
        <p className="text-gray-600">
          Overzicht van al je eerdere routes en sessies
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{routeSessions.length}</div>
            <div className="text-sm text-gray-600">Totaal sessies</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {routeSessions.reduce((acc, session) => acc + session.addresses.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Totaal adressen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {formatDuration(routeSessions.reduce((acc, session) => acc + session.estimatedTime, 0))}
            </div>
            <div className="text-sm text-gray-600">Totale tijd</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {routeSessions.reduce((acc, session) => 
                acc + session.addresses.reduce((sessionAcc, addr) => 
                  sessionAcc + (addr.packageType === 1 ? 1 : 0) + (addr.packageType === 2 ? 1 : 0), 0
                ), 0
              )}
            </div>
            <div className="text-sm text-gray-600">Totaal pakketten</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Alle sessies</h4>
        {routeSessions.map((session, index) => {
          const packageType1Count = session.addresses.filter(a => a.packageType === 1).length;
          const packageType2Count = session.addresses.filter(a => a.packageType === 2).length;
          const isCompleted = session.completedAt !== undefined;

          return (
            <Card key={session.id} className={`transition-all hover:shadow-md ${isCompleted ? 'border-green-200 bg-green-50' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{session.name}</span>
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Voltooid
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Gecreëerd op {formatDate(session.createdAt)}
                      {isCompleted && session.completedAt && (
                        <span> • Voltooid op {formatDate(session.completedAt)}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Bekijk
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{session.name}</DialogTitle>
                          <DialogDescription>
                            Route details en adressen overzicht
                          </DialogDescription>
                        </DialogHeader>
                        {selectedSession && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{selectedSession.addresses.length}</div>
                                <div className="text-sm text-blue-600">Adressen</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{formatDuration(selectedSession.estimatedTime)}</div>
                                <div className="text-sm text-green-600">Tijd</div>
                              </div>
                              <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <div className="text-lg font-bold text-purple-600">{selectedSession.estimatedDistance.toFixed(1)} km</div>
                                <div className="text-sm text-purple-600">Afstand</div>
                              </div>
                              <div className="text-center p-3 bg-orange-50 rounded-lg">
                                <div className="text-lg font-bold text-orange-600">{selectedSession.optimizedOrder.length}</div>
                                <div className="text-sm text-orange-600">Stops</div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold mb-2">Adressen in volgorde:</h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {selectedSession.optimizedOrder.map((addressIndex, orderIndex) => {
                                  const address = selectedSession.addresses[addressIndex];
                                  return (
                                    <div key={address.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                                      <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                                        {orderIndex + 1}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium">
                                          {address.street} {address.houseNumber}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {address.postalCode} {address.city}
                                        </div>
                                      </div>
                                      <Badge variant={address.packageType === 1 ? "default" : "secondary"}>
                                        Pakket {address.packageType}
                                      </Badge>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{session.addresses.length} adressen</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{formatDuration(session.estimatedTime)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span>{packageType1Count} × Type 1</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-green-500" />
                    <span>{packageType2Count} × Type 2</span>
                  </div>
                  <div className="text-gray-600">
                    {session.estimatedDistance.toFixed(1)} km
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default History;
