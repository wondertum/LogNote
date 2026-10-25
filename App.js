import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { jsPDF } from 'jspdf';
import { zip } from 'react-native-zip-archive';

const APP_PIN = "1234";

export default function App() {
  const [screen, setScreen] = useState('login'); 
  const [pinInput, setPinInput] = useState('');
  const [formType, setFormType] = useState(''); 
  const [dataKegiatan, setDataKegiatan] = useState([]);
  const [formData, setFormData] = useState({
    tanggal: '', kode: '', utama: '', peserta: '', pemateri: '', pj: '', budget: '', keterangan: ''
  });

  const handleLogin = () => {
    if (pinInput === APP_PIN) {
      setScreen('main');
      setPinInput('');
    } else {
      Alert.alert("Gagal", "PIN yang kamu masukkan salah.");
      setPinInput('');
    }
  };

  const handleSimpan = () => {
    if (!formData.utama) {
      Alert.alert("Perhatian", "Kolom Kegiatan/Materi tidak boleh kosong.");
      return;
    }
    const pesertaArray = formData.peserta.split(',').map(item => item.trim()).filter(item => item);
    
    const dataBaru = {
      Tipe: formType,
      Tanggal: formData.tanggal || new Date().toLocaleDateString('id-ID'),
      Kode: formData.kode,
      Kegiatan: formData.utama,
      Peserta: pesertaArray,
      Pemateri: formData.pemateri,
      PJ: formData.pj,
      Budget: formData.budget,
      Keterangan: formData.keterangan
    };

    setDataKegiatan([...dataKegiatan, dataBaru]);
    Alert.alert("Berhasil", "Kegiatan sudah dicatat!");
    setFormData({ tanggal: '', kode: '', utama: '', peserta: '', pemateri: '', pj: '', budget: '', keterangan: '' });
    setScreen('main');
  };

  const handleExport = async () => {
    if (dataKegiatan.length === 0) {
      Alert.alert("Kosong", "Belum ada kegiatan yang dicatat.");
      return;
    }

    try {
      Alert.alert("Memproses", "Sedang menyiapkan file ZIP...");
      const tempFolder = FileSystem.cacheDirectory + "ExportTemp/";
      const checkDir = await FileSystem.getInfoAsync(tempFolder);
      if (!checkDir.exists) await FileSystem.makeDirectoryAsync(tempFolder, { intermediates: true });

      const backupData = JSON.stringify({ kegiatan: dataKegiatan });
      await FileSystem.writeAsStringAsync(tempFolder + "backup_data.json", backupData);

      dataKegiatan.forEach(async (item, index) => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Tipe: ${item.Tipe} - ${item.Tanggal}`, 10, 20);
        doc.setFontSize(12);
        doc.text(`Detail: ${item.Kegiatan}`, 10, 30);
        doc.text(`Peserta: ${item.Peserta.join(', ')}`, 10, 40);
        if(item.Tipe !== 'STR') {
          doc.text(`Budget: Rp${item.Budget}`, 10, 50);
        }
        
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await FileSystem.writeAsStringAsync(
          `${tempFolder}Kegiatan_${index + 1}_${item.Tipe}.pdf`, 
          pdfBase64, 
          { encoding: FileSystem.EncodingType.Base64 }
        );
      });

      const targetZipPath = FileSystem.documentDirectory + "Export_Kegiatan.zip";
      await zip(tempFolder, targetZipPath, "Rahasia123"); 

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetZipPath);
      } else {
        Alert.alert("Selesai", `Tersimpan di: ${targetZipPath}`);
      }

      await FileSystem.deleteAsync(tempFolder, { idempotent: true });
    } catch (error) {
      Alert.alert("Gagal", "Terjadi kesalahan saat export: " + error.message);
    }
  };

  if (screen === 'login') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Halo!</Text>
          <Text style={styles.subtitle}>Masukkan PIN untuk membuka catatanmu</Text>
          <TextInput style={styles.inputCenter} keyboardType="numeric" secureTextEntry={true} value={pinInput} onChangeText={setPinInput} maxLength={4} />
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.buttonText}>Buka Aplikasi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'main') {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Catatan Hari Ini</Text>
        <Text style={styles.subtitle}>Ada {dataKegiatan.length} kegiatan tersimpan.</Text>
        
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuCard} onPress={() => setScreen('formMenu')}>
            <Text style={styles.menuIcon}>✍️</Text>
            <Text style={styles.menuText}>Tambah Kegiatan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} onPress={handleExport}>
            <Text style={styles.menuIcon}>📦</Text>
            <Text style={styles.menuText}>Export File</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dangerButton} onPress={() => setScreen('login')}>
          <Text style={styles.buttonText}>🔒 Kunci Layar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'formMenu') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.header}>Pilih Tipe Laporan</Text>
        <TouchableOpacity style={styles.typeButton} onPress={() => { setFormType('R'); setScreen('formInput'); }}>
          <Text style={styles.typeTitle}>R (Reguler)</Text>
          <Text style={styles.typeDesc}>Laporan lengkap untuk kegiatan umum.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.typeButton} onPress={() => { setFormType('T'); setScreen('formInput'); }}>
          <Text style={styles.typeTitle}>T (Materi)</Text>
          <Text style={styles.typeDesc}>Laporan khusus penyampaian materi.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.typeButton} onPress={() => { setFormType('STR'); setScreen('formInput'); }}>
          <Text style={styles.typeTitle}>STR (Singkat)</Text>
          <Text style={styles.typeDesc}>Laporan singkat & padat.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => setScreen('main')}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if
