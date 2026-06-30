// Script to add category/subproduct system to project-detail-page.tsx
import { readFileSync, writeFileSync } from 'fs'

const file = readFileSync('/home/z/my-project/src/components/castalia/project-detail-page.tsx', 'utf8')

// 1. Add state variables after share link state (line 63)
const stateInsert = `
  // SubProducts (categories)
  const [subProducts, setSubProducts] = useState<any[]>([])
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  [showNewSub, setShowNewSub] = useState(false)
  const [renamingSubId, setRenamingSubId] = useState<string | null>(null)
  const [renameSubValue, setRenameSubValue] = useState('')
`

const afterShareLink = `  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
`
const beforeShareLink = `  // Share link
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
`

if (!file.includes('subProducts')) {
  const newFile = file.replace(afterShareLink, afterShareLink + stateInsert)
  writeFileSync('/home/z/my-project/src/components/castalia/project-detail-page.tsx', newFile)
  console.log('Added state variables')
} else {
  console.log('State variables already exist')
}
