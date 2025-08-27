import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus, Euro, MapPin, Clock, Route } from 'lucide-react';
import { earningsService } from '../services/earnings.service';
import { EarningsEntry } from '../types/earnings';

interface EarningsTrackerProps {
  currentRoute?: {
    id: string;
    name: string;
    addresses: string[];
    distance: number;
    duration: number;
  };
  onEarningAdded?: (earning: EarningsEntry) => void;
}

export const EarningsTracker: React.FC<EarningsTrackerProps> = ({ 
  currentRoute, 
  onEarningAdded 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    customDistance: '',
    customDuration: ''
  });  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Voer een geldig bedrag in');
      return;
    }
    
    const distance = formData.customDistance 
      ? parseFloat(formData.customDistance)
      : currentRoute?.distance || 0;
    
    const duration = formData.customDuration
      ? parseFloat(formData.customDuration)
      : currentRoute?.duration || 0;
    
    if (distance <= 0) {
      toast.error('Voer een geldige afstand in');
      return;
    }
    
    const earning = earningsService.addEarning({
      routeId: currentRoute?.id,
      routeName: currentRoute?.name,
      amount,
      date: new Date().toISOString(),
      distance,
      duration,
      description: formData.description || undefined,
      addresses: currentRoute?.addresses
    });
    
    toast.success(`€${amount.toFixed(2)} toegevoegd aan je verdiensten!`);
    
    // Reset form
    setFormData({
      amount: '',
      description: '',
      customDistance: '',
      customDuration: ''
    });
    
    setIsOpen(false);
    onEarningAdded?.(earning);
  };  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Verdiensten Toevoegen
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-green-600" />
            Verdiensten Registreren
          </DialogTitle>
        </DialogHeader>
        
        {currentRoute && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-600" />
                Huidige Route: {currentRoute.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {currentRoute.distance.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(currentRoute.duration)} min
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {currentRoute.addresses.slice(0, 3).map((addr, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {addr.length > 20 ? addr.substring(0, 20) + '...' : addr}
                  </Badge>
                ))}
                {currentRoute.addresses.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentRoute.addresses.length - 3} meer
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Verdiend Bedrag (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
                className="text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving (optioneel)</Label>
              <Input
                id="description"
                type="text"
                placeholder="bijv. Pakketjes bezorgen, Boodschappen"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          
          {!currentRoute && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="customDistance">Afstand (km) *</Label>
                <Input
                  id="customDistance"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={formData.customDistance}
                  onChange={(e) => setFormData(prev => ({ ...prev, customDistance: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customDuration">Duur (minuten)</Label>
                <Input
                  id="customDuration"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.customDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, customDuration: e.target.value }))}
                />
              </div>
            </div>
          )}          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Annuleren
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Verdiensten Toevoegen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};