import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ArrowLeft, Plus, X, Info, Calendar, Check } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RecyclingPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Entry date for past-dated entries
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [batches, setBatches] = useState([{
    battery_type: 'PP',
    battery_kg: '',
    battery_images: []
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
      battery_type: 'PP',
      battery_kg: '',
      battery_images: []
    }]);
    setImagePreviews([...imagePreviews, {}]);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  // Handle multiple files for a field
  const handleMultipleFileChange = async (batchIndex, field, files) => {
    if (!files || files.length === 0) return;
    
    const compressedFiles = [];
    const previewUrls = [];
    
    for (const file of Array.from(files)) {
      const compressedFile = await compressImage(file);
      compressedFiles.push(compressedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        previewUrls.push(reader.result);
        if (previewUrls.length === files.length) {
          const newPreviews = [...imagePreviews];
          newPreviews[batchIndex] = { 
            ...newPreviews[batchIndex], 
            [field]: [...(newPreviews[batchIndex]?.[field] || []), ...previewUrls]
          };
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(compressedFile);
    }
    
    const newBatches = [...batches];
    newBatches[batchIndex][field] = [...(newBatches[batchIndex][field] || []), ...compressedFiles];
    setBatches(newBatches);
  };

  const removeImage = (batchIndex, field, imageIndex) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = newBatches[batchIndex][field].filter((_, i) => i !== imageIndex);
    setBatches(newBatches);
    
    const newPreviews = [...imagePreviews];
    if (newPreviews[batchIndex]?.[field]) {
      newPreviews[batchIndex][field] = newPreviews[batchIndex][field].filter((_, i) => i !== imageIndex);
      setImagePreviews(newPreviews);
    }
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    setBatches(newBatches);
  };

  const calculateReceivable = (batteryKg, batteryType) => {
    if (!batteryKg) return 0;
    let percentage = 0.605;
    if (batteryType === 'PP') percentage = 0.605;
    else if (batteryType === 'MC/SMF') percentage = 0.575;
    else if (batteryType === 'HR') percentage = 0.50;
    return (parseFloat(batteryKg) * percentage).toFixed(2);
  };

  const handleSubmit = async () => {
    const completeBatches = batches.filter(batch => 
      batch.battery_kg && batch.battery_images.length > 0
    );

    if (completeBatches.length === 0) {
      toast.error('Please complete at least one battery input (weight + photo)');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      
      const batchesData = completeBatches.map(batch => ({
        battery_type: batch.battery_type,
        battery_kg: parseFloat(batch.battery_kg),
        receivable_kg: parseFloat(calculateReceivable(batch.battery_kg, batch.battery_type))
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      form.append('entry_date', entryDate);
      
      completeBatches.forEach(batch => {
        if (batch.battery_images[0]) form.append('files', batch.battery_images[0]);
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/recycling/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${completeBatches.length} batch(es) saved successfully!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return batches.some(batch => batch.battery_kg && batch.battery_images.length > 0);
  };

  const renderMultiImageUpload = (batchIndex, field, label) => {
    const images = imagePreviews[batchIndex]?.[field] || [];
    
    return (
      <div>
        <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </Label>
        
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img, imgIdx) => (
              <div key={imgIdx} className="relative">
                <img src={img} alt={`Preview ${imgIdx + 1}`} className="h-24 w-full object-cover rounded-lg border-2 border-slate-200" />
                <button
                  onClick={() => removeImage(batchIndex, field, imgIdx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <label
          htmlFor={`${field}-${batchIndex}`}
          className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer h-32 flex flex-col items-center justify-center gap-2"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-8 h-8 text-slate-400" />
            <Plus className="w-6 h-6 text-slate-400" />
          </div>
          <span className="text-base font-semibold text-slate-500">
            {images.length > 0 ? 'Add more photos' : 'Tap to capture photos'}
          </span>
          <span className="text-xs text-slate-400">Multiple images allowed</span>
        </label>
        
        <input
          id={`${field}-${batchIndex}`}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleMultipleFileChange(batchIndex, field, e.target.files)}
          className="hidden"
        />
        
        {images.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">{images.length} photo(s) added</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Battery Recycling</h1>
              <p className="text-base text-slate-600">{batches.length} batch(es)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Date Picker */}
        <Card className="bg-green-50 border-green-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <Label className="text-sm font-bold text-green-700 uppercase">Entry Date</Label>
            </div>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 text-lg px-4 border-2 border-green-200 rounded-lg bg-white"
            />
          </div>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-base font-semibold text-blue-900">Lead Receivable Calculation</p>
              <p className="text-sm text-blue-700">PP: 60.5% | MC/SMF: 57.5% | HR: 50%</p>
            </div>
          </div>
        </Card>

        {/* Batch Forms */}
        {batches.map((batch, batchIndex) => (
          <Card key={batchIndex} className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Batch {batchIndex + 1}</h3>
              {batches.length > 1 && (
                <Button
                  onClick={() => removeBatch(batchIndex)}
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Battery Type
                </Label>
                <Select
                  value={batch.battery_type}
                  onValueChange={(value) => handleInputChange(batchIndex, 'battery_type', value)}
                >
                  <SelectTrigger className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PP" className="text-xl">PP Battery</SelectItem>
                    <SelectItem value="MC/SMF" className="text-xl">MC/SMF Battery</SelectItem>
                    <SelectItem value="HR" className="text-xl">HR Battery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Battery Weight (KG)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batch.battery_kg}
                  onChange={(e) => handleInputChange(batchIndex, 'battery_kg', e.target.value)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg"
                  placeholder="0.00"
                />
              </div>

              {renderMultiImageUpload(batchIndex, 'battery_images', 'Photos of Battery Weight')}

              {/* Auto-calculated receivable */}
              {batch.battery_kg && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <Label className="block text-sm font-bold text-green-700 uppercase tracking-wider mb-2">
                    Lead Receivable from Recycling
                  </Label>
                  <p className="text-4xl font-bold text-green-700">
                    {calculateReceivable(batch.battery_kg, batch.battery_type)} kg
                  </p>
                </div>
              )}
            </div>
          </Card>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={addBatch}
            className="flex-1 h-16 text-xl font-bold bg-slate-600 hover:bg-slate-700 text-white shadow-lg rounded-lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            Add Battery
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit() || loading}
            className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : `Save ${batches.filter(b => b.battery_kg && b.battery_images.length > 0).length} Batch(es)`}
            <Check className="w-6 h-6 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
