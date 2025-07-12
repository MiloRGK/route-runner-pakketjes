
import { useState } from 'react';
import { Clock, MapPin, Calendar, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RouteSession } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';

interface HistoryProps {
  routeSessions: RouteSession[];
}

const History = ({ routeSessions }: HistoryProps) => {
  const [selectedSession, setSelectedSession] = useState<RouteSession | null>(null);

  if (routeSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Geen historie beschikbaar</h3>
        <p className="text-gray-500">
          Je route geschiedenis zal hier verschijnen nadat je routes hebt gemaakt.
        </p>
      </div>
    );
  }

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
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusBadge = (session: RouteSession) => {
    if (session.completedAt) {
      return <Badge className="bg-green-100 text-green-800">Voltooid</Badge>;
    }
    return <Badge variant="secondary">In uitvoering</Badge>;
  };

  const handleDeleteSession = (sessionId: string) => {
    // In a real app, this would update the parent state
    toast({
      title: "Sessie verwijderd",
      description: "De route sessie is verwijderd uit de geschiedenis.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Route historie</h3>
        <p className="text-gray-600">
          Bekijk al je uitgevoerde en geplande routes
        </p>
      </div>

      {/* History Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{routeSessions.length}</div>
            <div className="text-sm text-gray-600">Totaal sessies</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {routeSessions.filter(s => s.completedAt).length}
            </div>
            <div className="text-sm text-gray-600">Voltooide sessies</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {routeSessions.reduce((sum, session) => sum + session.addresses.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Totaal adressen</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alle sessies</CardTitle>
            <CardDescription>
              Chronologisch overzicht van je route sessies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {routeSessions.slice().reverse().map((session) => (
                <div 
                  key={session.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSession?.id === session.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{session.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(session.createdAt)}
                      </p>
                    </div>
                    {getStatusBadge(session)}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{session.addresses.length} adressen</span>
                    <span>{formatDuration(session.estimatedTime)} • {session.estimatedDistance.toFixed(1)} km</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Sessie details</CardTitle>
            <CardDescription>
              {selectedSession ? 'Details van de geselecteerde sessie' : 'Selecteer een sessie voor details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSession ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">{selectedSession.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Aangemaakt:</span>
                      <div className="font-medium">{formatDate(selectedSession.createdAt)}</div>
                    </div>
                    {selectedSession.completedAt && (
                      <div>
                        <span className="text-gray-600">Voltooid:</span>
                        <div className="font-medium">{formatDate(selectedSession.completedAt)}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Adressen:</span>
                      <div className="font-medium">{selectedSession.addresses.length}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Geschatte tijd:</span>
                      <div className="font-medium">{formatDuration(selectedSession.estimatedTime)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Afstand:</span>
                      <div className="font-medium">{selectedSession.estimatedDistance.toFixed(1)} km</div>
                    </div>
                  </div>
                </div>

                {/* Package Type Distribution */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-2">Pakket verdeling</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pakket Type 1:</span>
                      <Badge variant="outline">
                        {selectedSession.addresses.filter(a => a.packageType === 1).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pakket Type 2:</span>
                      <Badge variant="outline">
                        {selectedSession.addresses.filter(a => a.packageType === 2).length}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    Bekijk route
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteSession(selectedSession.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Selecteer een sessie links om details te zien</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;
