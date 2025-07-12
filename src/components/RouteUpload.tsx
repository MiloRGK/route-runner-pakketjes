
import { useState, useRef } from 'react';
import { Upload, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Address } from '@/pages/Index';
import { toast } from '@/hooks/use-toast';

interface RouteUploadProps {
  onAddressesUploaded: (addresses: Address[]) => void;
}

const RouteUpload = ({ onAddressesUploaded }: RouteUploadProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState({
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    packageType: 1 as 1 | 2
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      toast({
        title: "PDF Upload",
        description: "PDF parsing wordt binnenkort toegevoegd. Gebruik voorlopig handmatige invoer.",
      });
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        parseCSV(csv);
      };
      reader.readAsText(file);
    } else {
      toast({
        title: "Bestandstype niet ondersteund",
        description: "Upload een CSV of PDF bestand.",
        variant: "destructive"
      });
    }
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n');
    const parsedAddresses: Address[] = [];

    lines.slice(1).forEach((line, index) => {
      const [street, houseNumber, postalCode, city, packageType] = line.split(',').map(s => s.trim());
      
      if (street && houseNumber && postalCode && city) {
        parsedAddresses.push({
          id: `addr-${Date.now()}-${index}`,
          street,
          houseNumber,
          postalCode,
          city,
          packageType: packageType === '2' ? 2 : 1
        });
      }
    });

    if (parsedAddresses.length > 0) {
      setAddresses(parsedAddresses);
      toast({
        title: "Upload succesvol",
        description: `${parsedAddresses.length} adressen geïmporteerd.`,
      });
    }
  };

  const addManualAddress = () => {
    if (!newAddress.street || !newAddress.houseNumber || !newAddress.postalCode || !newAddress.city) {
      toast({
        title: "Vul alle velden in",
        description: "Alle adresvelden zijn verplicht.",
        variant: "destructive"
      });
      return;
    }

    const address: Address = {
      id: `addr-${Date.now()}`,
      ...newAddress
    };

    setAddresses([...addresses, address]);
    setNewAddress({
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      packageType: 1
    });

    toast({
      title: "Adres toegevoegd",
      description: `${address.street} ${address.houseNumber} is toegevoegd.`,
    });
  };

  const removeAddress = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
  };

  const handleSubmit = () => {
    if (addresses.length === 0) {
      toast({
        title: "Geen adressen",
        description: "Voeg eerst adressen toe voordat je doorgaat.",
        variant: "destructive"
      });
      return;
    }

    onAddressesUploaded(addresses);
    toast({
      title: "Adressen geladen",
      description: `${addresses.length} adressen zijn klaar voor route-optimalisatie.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Upload je adressenlijst</h3>
        <p className="text-gray-600">
          Upload een CSV-bestand of voeg handmatig adressen toe
        </p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Bestand uploaden
          </CardTitle>
          <CardDescription>
            Upload een CSV-bestand met kolommen: Straat, Huisnummer, Postcode, Plaats, Pakkettype (1 of 2)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full">
            <label 
              htmlFor="file-upload" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Klik om te uploaden</span> of sleep bestanden hier
                </p>
                <p className="text-xs text-gray-500">CSV of PDF (max 10MB)</p>
              </div>
              <input 
                id="file-upload" 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".csv,.pdf"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Handmatig toevoegen
          </CardTitle>
          <CardDescription>
            Voeg individuele adressen toe aan je route
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="street">Straatnaam</Label>
              <Input
                id="street"
                value={newAddress.street}
                onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                placeholder="Hoofdstraat"
              />
            </div>
            <div>
              <Label htmlFor="houseNumber">Huisnummer</Label>
              <Input
                id="houseNumber"
                value={newAddress.houseNumber}
                onChange={(e) => setNewAddress({...newAddress, houseNumber: e.target.value})}
                placeholder="123"
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postcode</Label>
              <Input
                id="postalCode"
                value={newAddress.postalCode}
                onChange={(e) => setNewAddress({...newAddress, postalCode: e.target.value})}
                placeholder="1234AB"
              />
            </div>
            <div>
              <Label htmlFor="city">Plaats</Label>
              <Input
                id="city"
                value={newAddress.city}
                onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                placeholder="Amsterdam"
              />
            </div>
            <div>
              <Label htmlFor="packageType">Pakkettype</Label>
              <Select 
                value={newAddress.packageType.toString()} 
                onValueChange={(value) => setNewAddress({...newAddress, packageType: parseInt(value) as 1 | 2})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Kies pakkettype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Pakket 1</SelectItem>
                  <SelectItem value="2">Pakket 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addManualAddress} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Toevoegen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address List */}
      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Geüpload adressen ({addresses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {addresses.map((address) => (
                <div key={address.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">
                      {address.street} {address.houseNumber}
                    </span>
                    <span className="text-gray-600 ml-2">
                      {address.postalCode} {address.city}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      address.packageType === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      Pakket {address.packageType}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAddress(address.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleSubmit} className="w-full" size="lg">
                Doorgaan naar route-optimalisatie ({addresses.length} adressen)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteUpload;
